import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { adaptive } from "@toss/tds-colors";
import { mockTds } from "@/__tests__/__helpers__/mocks";
import type { PairRow } from "@/lib/types";
import { RaiseBars } from "@/components/RaiseBars";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

mockTds();

// 계약(코더용): 행 = ListRow(li), 막대 요소 = data-testid "bar-nominal" / "bar-real",
// 막대 요소에 style.width(%)·style.background(토큰 var) + data-side="right"|"left"(축 기준 방향).
// 색 토큰은 @toss/tds-colors의 adaptive.red500 / adaptive.blue500 (= var(--adaptiveRed500) 등).

const row = (o: Partial<PairRow>): PairRow => ({
  fromYear: 2023,
  toYear: 2024,
  gapYears: 1,
  nominalPct: 0,
  realPct: 0,
  ...o,
});

const renderBars = (rows: PairRow[]) =>
  render(React.createElement(MemoryRouter, null, React.createElement(RaiseBars, { rows })));

const widthOf = (el: HTMLElement) => parseFloat(el.style.width);
const styleOf = (el: HTMLElement) => el.getAttribute("style") ?? "";

const baseRows = [
  row({ fromYear: 2022, toYear: 2023, nominalPct: 5.0, realPct: 1.4 }),
  row({ fromYear: 2023, toYear: 2024, nominalPct: 2.0, realPct: -3.0 }),
];

describe("RaiseBars 컴포넌트 (명목 vs 실질 막대)", () => {
  it("AC-1: rows 2개면 ListRow 2개, 막대 길이는 max|값|=5.0 기준 %이고 양수는 축 오른쪽", () => {
    renderBars(baseRows);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const first = within(items[0]);
    const nominal = first.getByTestId("bar-nominal");
    const real = first.getByTestId("bar-real");
    expect(nominal.style.width).toBe("100%");
    expect(widthOf(real)).toBeCloseTo(28, 0);
    expect(Math.abs(widthOf(real) - 28)).toBeLessThanOrEqual(0.1);
    expect(nominal.dataset.side).toBe("right");
    expect(real.dataset.side).toBe("right");
  });

  it("AC-2: 실질 -3.0은 축 왼쪽 60% + red500 + '구매력 감소', 실질 +1.4는 blue500이고 문구 없음", () => {
    renderBars(baseRows);
    const items = screen.getAllByRole("listitem");
    const neg = within(items[1]);
    const negBar = neg.getByTestId("bar-real");
    expect(negBar.dataset.side).toBe("left");
    expect(negBar.style.width).toBe("60%");
    expect(styleOf(negBar)).toContain(adaptive.red500);
    expect(neg.getByText(/구매력 감소/)).toBeInTheDocument();

    const pos = within(items[0]);
    expect(styleOf(pos.getByTestId("bar-real"))).toContain(adaptive.blue500);
    expect(pos.queryByText(/구매력 감소/)).toBeNull();
  });

  it("AC-3: fromMemo가 라벨에 '2024 · 이직'처럼 그대로 보인다", () => {
    renderBars([row({ fromYear: 2024, toYear: 2025, fromMemo: "이직", nominalPct: 3, realPct: 1 })]);
    expect(screen.getByText(/2024 · 이직/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("AC-4: gapYears=2는 '2021→2023 (2년)', gapYears=1은 '(N년)'이 없다", () => {
    renderBars([
      row({ fromYear: 2021, toYear: 2023, gapYears: 2, nominalPct: 4, realPct: 1 }),
      row({ fromYear: 2023, toYear: 2024, gapYears: 1, nominalPct: 4, realPct: 1 }),
    ]);
    expect(screen.getByText("2021→2023 (2년)")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(within(items[1]).queryByText(/\(\d+년\)/)).toBeNull();
    expect(within(items[1]).getByText(/2023→2024/)).toBeInTheDocument();
  });

  it("AC-5: 캡션은 '명목 +5.0% · 실질 +1.4%' 형식이고 음수는 U+2212", () => {
    renderBars(baseRows);
    expect(screen.getByText("명목 +5.0% · 실질 +1.4%")).toBeInTheDocument();
    expect(screen.getByText("명목 +2.0% · 실질 −3.0%")).toBeInTheDocument();
  });

  it("AC-6: 모든 값이 0이면 막대 width는 모두 '0%'이고 NaN이 없다", () => {
    const { container } = renderBars([row({}), row({ fromYear: 2024, toYear: 2025 })]);
    const bars = [...screen.getAllByTestId("bar-nominal"), ...screen.getAllByTestId("bar-real")];
    expect(bars).toHaveLength(4);
    bars.forEach((b) => expect(b.style.width).toBe("0%"));
    expect(container.innerHTML).not.toContain("NaN");
    expect(screen.getAllByText("명목 +0.0% · 실질 +0.0%")).toHaveLength(2);
  });

  it("AC-7: 소스에 HEX 색과 margin/padding 스타일이 0개다", () => {
    const src = readFileSync(resolve(__dirname, "../components/RaiseBars.tsx"), "utf8");
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toHaveLength(0);
    expect(src.match(/\b(margin|padding)[A-Za-z]*\s*:/g) ?? []).toHaveLength(0);
  });
});
