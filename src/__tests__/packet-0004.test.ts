import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { mockTds, mockAppsInToss, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import { __resetForTest } from "@/lib/entriesStore";
import Home from "@/pages/Home";

mockTds();
mockAppsInToss();

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

const KEY = "real-raise-check:v1:entries";
const HINT = "연봉을 2개 연도 이상 입력해 주세요";
const YEARS = [2021, 2022, 2023, 2024, 2025];

function renderHome() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Home)));
}
const amountInput = (year: number) =>
  screen.getByLabelText(`${year}년 세전 연봉(만원)`) as HTMLInputElement;
const memoInput = (year: number) =>
  screen.getByLabelText(new RegExp(`${year}년.*메모`)) as HTMLInputElement;
const stored = () => {
  const raw = localStorage.getItem(KEY);
  return raw === null ? null : JSON.parse(raw);
};
const type = (el: HTMLInputElement, v: string) => fireEvent.change(el, { target: { value: v } });
const cta = () => screen.getByRole("button", { name: /결과/ }) as HTMLButtonElement;
const invalidCount = () =>
  document.querySelectorAll('input[aria-invalid="true"]').length;

beforeEach(() => {
  __resetForTest();
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("Home Page (연도별 연봉 입력)", () => {
  it("AC-1: 첫 진입은 2021~2025 슬롯 5개, 안내문, 에러 0개, CTA 비활성 + hint", () => {
    renderHome();
    const inputs = YEARS.map(amountInput);
    expect(inputs).toHaveLength(5);
    const all = Array.from(document.querySelectorAll("input")).filter((i) =>
      /세전 연봉/.test(i.getAttribute("aria-label") ?? ""),
    );
    expect(all.map((i) => i.getAttribute("aria-label"))).toEqual(
      YEARS.map((y) => `${y}년 세전 연봉(만원)`),
    );
    expect(screen.getByText("최근 연봉을 입력하면 물가를 뺀 진짜 인상률을 알려드려요")).toBeInTheDocument();
    expect(invalidCount()).toBe(0);
    expect(cta().disabled).toBe(true);
    expect(screen.getByText(HINT)).toBeInTheDocument();
  });

  it("AC-2[P0]: '4200' → '4,200' 표시 + 저장 amountMan 정수", () => {
    renderHome();
    type(amountInput(2023), "4200");
    expect(amountInput(2023).value).toBe("4,200");
    const data = stored();
    expect(data).toHaveLength(1);
    expect(data[0].year).toBe(2023);
    expect(data[0].amountMan).toBe(4200);
    expect(Number.isInteger(data[0].amountMan)).toBe(true);
  });

  it("AC-2[P0]: '4200.5'·'abc'·'-5000'은 무시되고 저장소는 그대로, '4','$','0','0'은 '400'", () => {
    renderHome();
    const el = amountInput(2024);
    for (const bad of ["4200.5", "abc", "-5000"]) {
      type(el, bad);
      expect(el.value).toBe("");
      expect(localStorage.getItem(KEY)).toBeNull();
    }
    let current = "";
    for (const ch of ["4", "$", "0", "0"]) {
      type(el, current + ch);
      current = el.value;
    }
    expect(el.value).toBe("400");
    expect(stored()[0].amountMan).toBe(400);
  });

  it("AC-3: 메모는 최대 10자", () => {
    renderHome();
    type(memoInput(2022), "1234567890");
    expect(memoInput(2022).value).toBe("1234567890");
    type(memoInput(2022), "12345678901");
    expect(memoInput(2022).value).toBe("1234567890");
  });

  it("AC-4[P0]: '0'·'100001'은 blur 후에만 hasError + help, CTA 비활성", () => {
    renderHome();
    const msg = "1만원 ~ 100,000만원 사이로 입력해 주세요";
    for (const bad of ["0", "100001"]) {
      cleanup();
      __resetForTest();
      localStorage.clear();
      renderHome();
      const el = amountInput(2025);
      type(el, bad);
      expect(el.getAttribute("aria-invalid")).not.toBe("true");
      expect(screen.queryByText(msg)).toBeNull();
      fireEvent.blur(el);
      expect(el.getAttribute("aria-invalid")).toBe("true");
      expect(screen.getByText(msg)).toBeInTheDocument();
      expect(cta().disabled).toBe(true);
    }
  });

  it("AC-5[P0]: 유효 2개 연도면 CTA 활성, 누르면 success 햅틱 후 /result 이동", () => {
    renderHome();
    type(amountInput(2022), "3800");
    expect(cta().disabled).toBe(true);
    type(amountInput(2025), "4200");
    expect(cta().disabled).toBe(false);
    fireEvent.click(cta());
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    expect(mockNavigate).toHaveBeenCalledWith("/result");
  });

  it("AC-6: 칸을 지우면 저장에서 빠지고, 새로고침하면 금액·메모가 복원된다", () => {
    const view = renderHome();
    type(amountInput(2022), "3800");
    type(memoInput(2022), "이직");
    type(amountInput(2024), "4100");
    type(amountInput(2024), "");
    expect(stored().map((e: { year: number }) => e.year)).toEqual([2022]);
    view.unmount();
    __resetForTest();
    renderHome();
    expect(amountInput(2022).value).toBe("3,800");
    expect(memoInput(2022).value).toBe("이직");
    expect(amountInput(2024).value).toBe("");
  });

  it("AC-7: 전체 지우기 → 다이얼로그에서 '지우기'는 비우고 키 삭제, '닫기'는 유지", async () => {
    renderHome();
    type(amountInput(2022), "3800");
    type(amountInput(2025), "4200");

    fireEvent.click(screen.getByRole("button", { name: "전체 지우기" }));
    let dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("입력한 연봉을 모두 지울까요?")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(amountInput(2022).value).toBe("3,800");
    expect(localStorage.getItem(KEY)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "전체 지우기" }));
    dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "지우기" }));
    await waitFor(() => expect(amountInput(2022).value).toBe(""));
    YEARS.forEach((y) => expect(amountInput(y).value).toBe(""));
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("AC-8[P0]: 저장 실패 Toast는 연속 실패 구간당 정확히 1회", () => {
    renderHome();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    type(amountInput(2022), "3800");
    type(amountInput(2025), "4200");
    const saveFail = mockOpenToast.mock.calls.filter(
      (c) => c[0] === "저장하지 못했어요. 앱을 닫으면 입력이 사라질 수 있어요",
    );
    expect(saveFail).toHaveLength(1);
    expect(amountInput(2025).value).toBe("4,200");
  });

  it("AC-8: 지우기 실패 시 칸은 비고 Toast가 뜬다", async () => {
    renderHome();
    type(amountInput(2022), "3800");
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    fireEvent.click(screen.getByRole("button", { name: "전체 지우기" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "지우기" }));
    await waitFor(() => expect(amountInput(2022).value).toBe(""));
    expect(mockOpenToast).toHaveBeenCalledWith("지우지 못했어요. 다시 시도해 주세요");
  });

  it("AC-9: 포커스하면 scrollIntoView({block:'center'}) 1회", () => {
    renderHome();
    fireEvent.focus(amountInput(2023));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "center" });
  });

  it("AC-10: 모든 Button·TextField에 aria-label, 소스에 HEX·인라인 margin/padding·console.error 없음", () => {
    renderHome();
    const fields = Array.from(document.querySelectorAll("input"));
    expect(fields).toHaveLength(10);
    fields.forEach((i) => expect(i.getAttribute("aria-label")).toBeTruthy());
    expect(screen.getByRole("button", { name: "전체 지우기" })).toBeInTheDocument();

    const src = readFileSync(resolve(__dirname, "../pages/Home.tsx"), "utf8");
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
    expect(src.match(/\b(margin|padding)[A-Za-z]*\s*:/g)).toBeNull();
    expect(src.match(/console\.error/g)).toBeNull();
  });
});
