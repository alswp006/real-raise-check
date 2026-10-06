import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { __resetForTest } from "@/lib/entriesStore";
import App from "@/App";

mockTds();
mockAppsInToss();

vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ state: {}, setInput: vi.fn() }),
}));
// 광고는 자리표시 — 라우팅 통합만 본다.
vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => React.createElement("div", { "data-testid": "ad-slot" }),
}));

const KEY = "real-raise-check:v1:entries";
const ROOT = resolve(__dirname, "../..");

function LocationProbe() {
  const loc = useLocation();
  return React.createElement("div", { "data-testid": "loc" }, loc.pathname);
}

function renderApp(path: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(App),
      React.createElement(LocationProbe),
    ),
  );
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "__tests__" || name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css|json)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

function scan(files: string[], re: RegExp): string[] {
  const hits: string[] = [];
  for (const f of files) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (re.test(line)) hits.push(`${f.replace(ROOT + "/", "")}:${i + 1}: ${line.trim()}`);
      });
  }
  return hits;
}

const srcFiles = () => walk(join(ROOT, "src"));

beforeEach(() => {
  __resetForTest();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => cleanup());

describe("Routing & Integration (App 라우트 + 검수 점검)", () => {
  it("AC-1[P0]: '/'에서 Home 제목과 연도 슬롯 5개가 렌더된다", () => {
    renderApp("/");
    expect(screen.getAllByText("진짜연봉체크").length).toBeGreaterThanOrEqual(1);
    const slots = Array.from(document.querySelectorAll("input")).filter((i) =>
      /세전 연봉/.test(i.getAttribute("aria-label") ?? ""),
    );
    expect(slots.map((i) => i.getAttribute("aria-label"))).toEqual(
      [2021, 2022, 2023, 2024, 2025].map((y) => `${y}년 세전 연봉(만원)`),
    );
    expect(screen.getByTestId("loc").textContent).toBe("/");
  });

  it("AC-1[P0]: '/result'에서 Result가 렌더되고, '/unknown'은 '/'로 이동한다", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { year: 2021, amountMan: 4000 },
        { year: 2025, amountMan: 4400 },
      ]),
    );
    const r = renderApp("/result");
    expect(screen.getByTestId("loc").textContent).toBe("/result");
    expect(screen.getByText(/목표 연봉/)).toBeInTheDocument();
    r.unmount();

    renderApp("/unknown");
    expect(screen.getByTestId("loc").textContent).toBe("/");
    expect(screen.getByLabelText("2021년 세전 연봉(만원)")).toBeInTheDocument();
  });

  it("AC-2[P0]: Home에서 2개 연도 입력 후 '계산하기'를 누르면 /result에서 목표 연봉이 보이고, 재마운트해도 유지된다", () => {
    const r = renderApp("/");
    fireEvent.change(screen.getByLabelText("2021년 세전 연봉(만원)"), { target: { value: "4000" } });
    fireEvent.change(screen.getByLabelText("2025년 세전 연봉(만원)"), { target: { value: "4400" } });
    fireEvent.click(screen.getByRole("button", { name: /계산하기/ }));
    expect(screen.getByTestId("loc").textContent).toBe("/result");
    expect(screen.getAllByText(/\d{1,3}(,\d{3})+원/).length).toBeGreaterThanOrEqual(1);
    const before = screen.getAllByText(/\d{1,3}(,\d{3})+원/).map((e) => e.textContent);
    r.unmount();

    // 새로고침 = 라우터 state 없이 /result 직접 진입
    renderApp("/result");
    const after = screen.getAllByText(/\d{1,3}(,\d{3})+원/).map((e) => e.textContent);
    expect(after).toEqual(before);
    expect(screen.getByText(/목표 연봉/)).toBeInTheDocument();
  });

  it("AC-2: 입력이 없으면 /result는 크래시 없이 렌더된다(빈 상태)", () => {
    renderApp("/result");
    expect(screen.getByTestId("loc").textContent).toBe("/result");
    expect(screen.queryByText(/\d{1,3}(,\d{3})+원/)).toBeNull();
  });

  it("AC-3: src에 외부 URL 이동(window.open·location.href 대입·target=_blank)이 0건이다", () => {
    expect(scan(srcFiles(), /window\.open|location\.href\s*=|target=.?_blank/)).toEqual([]);
  });

  it("AC-4: src에 console.error 호출이 0건이다", () => {
    expect(scan(srcFiles(), /console\.error/)).toEqual([]);
  });

  it("AC-5: src와 package.json에 외부 분석 SDK가 0건이다", () => {
    const files = [...srcFiles(), join(ROOT, "package.json")];
    expect(scan(files, /gtag|amplitude|mixpanel|firebase\/analytics/i)).toEqual([]);
  });

  it("AC-6: 지정 파일에 HEX 색상 하드코딩과 TDS 크기 덮어쓰기가 0건이다", () => {
    const hexTargets = [
      ...walk(join(ROOT, "src/pages")),
      join(ROOT, "src/components/RaiseBars.tsx"),
      join(ROOT, "src/components/ShareCardButton.tsx"),
      join(ROOT, "src/lib/shareCard.ts"),
    ].filter(existsSync);
    expect(hexTargets.length).toBeGreaterThanOrEqual(4);
    expect(scan(hexTargets, /#[0-9a-fA-F]{3,8}\b/)).toEqual([]);

    const sizeTargets = [
      join(ROOT, "src/pages/Home.tsx"),
      join(ROOT, "src/pages/Result.tsx"),
      join(ROOT, "src/components/ShareCardButton.tsx"),
    ].filter(existsSync);
    expect(scan(sizeTargets, /\b(min|max)?[hH]eight\s*:|\bpadding\w*\s*:|\bmargin\w*\s*:/)).toEqual([]);
  });
});
