import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockOpenToast, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
// 목 헬퍼가 SDK보다 먼저 평가돼야 아래 import가 목(스파이)을 받는다.
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { __resetForTest } from "@/lib/entriesStore";
import Result from "@/pages/Result";

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ state: {}, setInput: vi.fn() }),
}));

// AdSlot·ShareCardButton은 자리표시 목 — 개수·위치·showAmount만 본다(각자 패킷에서 따로 검증됨).
vi.mock("@/components/AdSlot", () => ({
  AdSlot: () => React.createElement("div", { "data-testid": "ad-slot" }),
}));
vi.mock("@/components/ShareCardButton", () => ({
  ShareCardButton: ({ showAmount }: { showAmount: boolean }) =>
    React.createElement("button", { "data-testid": "share-btn", "data-show-amount": String(showAmount) }, "공유 카드 저장"),
}));

const KEY = "real-raise-check:v1:entries";
const FIXTURE = [
  { year: 2021, amountMan: 4000 },
  { year: 2025, amountMan: 4400 },
];

function setNow(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

function renderResult() {
  return render(React.createElement(MemoryRouter, { initialEntries: ["/result"] }, React.createElement(Result)));
}

function seed(value: unknown) {
  localStorage.setItem(KEY, typeof value === "string" ? value : JSON.stringify(value));
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  __resetForTest();
  setNow("2026-03-10T09:00:00+09:00");
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
  vi.unstubAllEnvs();
});

describe("Result Page (목표 연봉 + 비교 + 배너)", () => {
  it("AC-1[P0]: F2-AC-3 픽스처 2026 진입 시 목표 연봉 블록이 보인다", () => {
    seed(FIXTURE);
    renderResult();
    expect(screen.getByText("올해(2026) 목표 연봉")).toBeInTheDocument();
    expect(screen.getAllByText(/46,410,000원/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/작년 연봉 대비 \+5\.5% 인상 필요/)).toBeInTheDocument();
    expect(screen.getByText("물가만큼만 올리는 연봉")).toBeInTheDocument();
    expect(screen.getByText(/44,880,000원/)).toBeInTheDocument();
    expect(screen.getByText("첫 해 구매력을 되찾는 연봉")).toBeInTheDocument();
    expect(
      screen.getByText("올해 물가는 한국은행 물가안정목표 2%로 가정했어요 · 세전 기준 참고용"),
    ).toBeInTheDocument();
  });

  it("AC-2: 누적 카드에 구매력 −3.3%, 명목 +10.0%, Badge '구매력 감소'가 보인다", () => {
    seed(FIXTURE);
    renderResult();
    expect(screen.getByText(/첫 해\(2021\) 대비 구매력/)).toBeInTheDocument();
    expect(screen.getAllByText(/[−-]3\.3%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/명목 \+10\.0%/)).toBeInTheDocument();
    expect(screen.getAllByText("구매력 감소").length).toBeGreaterThanOrEqual(1);
  });

  it("AC-3: RaiseBars 아래에 출처 줄이 보이고 막대가 렌더된다", () => {
    seed(FIXTURE);
    renderResult();
    const src = screen.getByText("출처: 통계청 소비자물가지수 연간 상승률(KOSIS) · 2025년 연간 기준");
    const bar = screen.getAllByTestId("bar-real")[0];
    expect(bar).toBeInTheDocument();
    expect(bar.compareDocumentPosition(src) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("AC-4: currentYear 2027(staleYears 2)이면 경고가 보이고, 2026이면 없다", () => {
    seed(FIXTURE);
    const first = renderResult();
    expect(screen.queryByText(/물가 데이터가 2025년까지만 있어요/)).toBeNull();
    expect(screen.getByText("올해(2026) 목표 연봉")).toBeInTheDocument();
    first.unmount();

    vi.useRealTimers();
    setNow("2027-03-10T09:00:00+09:00");
    renderResult();
    expect(screen.getByText(/물가 데이터가 2025년까지만 있어요/)).toBeInTheDocument();
    expect(screen.getByText("올해(2027) 목표 연봉")).toBeInTheDocument();
  });

  it("AC-5[P0]: 입력 연도가 0~1개면 Empty와 '연봉 입력하러 가기'(→ /)가 보인다", () => {
    seed([{ year: 2025, amountMan: 4400 }]);
    renderResult();
    expect(screen.getByText("입력한 연봉이 부족해요")).toBeInTheDocument();
    expect(screen.getByText("2개 연도 이상 입력하면 실질 인상률을 보여드려요")).toBeInTheDocument();
    expect(screen.queryByText(/목표 연봉/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "연봉 입력하러 가기" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-5: 저장값이 전혀 없어도 Empty 화면이 보인다", () => {
    renderResult();
    expect(screen.getByText("입력한 연봉이 부족해요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "연봉 입력하러 가기" })).toBeInTheDocument();
  });

  it("AC-6[P0]: 저장값 '{bad'이면 에러 화면, 키 삭제, console.error 0회, 버튼 동작", () => {
    seed("{bad");
    renderResult();
    expect(screen.getByText("결과를 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "입력 다시 하기" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-6: 에러 후 저장값을 복구하고 '다시 시도'를 누르면 결과가 나온다", () => {
    seed("{bad");
    renderResult();
    seed(FIXTURE);
    __resetForTest();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(screen.getByText("올해(2026) 목표 연봉")).toBeInTheDocument();
    expect(screen.queryByText("결과를 불러오지 못했어요")).toBeNull();
  });

  it("AC-7: Switch는 기본 꺼짐이고 토글하면 tickWeak 햅틱과 showAmount가 바뀐다", () => {
    seed(FIXTURE);
    renderResult();
    const sw = screen.getByRole("switch") as HTMLInputElement;
    expect(sw.checked).toBe(false);
    expect(screen.getByTestId("share-btn").getAttribute("data-show-amount")).toBe("false");
    fireEvent.click(sw);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(screen.getByTestId("share-btn").getAttribute("data-show-amount")).toBe("true");
  });

  it("AC-8: AdSlot은 정확히 1개이고 공유·다시 입력하기 버튼보다 아래, TossRewardAd는 없다", () => {
    seed(FIXTURE);
    const { container } = renderResult();
    const ads = screen.getAllByTestId("ad-slot");
    expect(ads).toHaveLength(1);
    const follows = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(screen.getByTestId("share-btn"), ads[0])).toBe(true);
    expect(follows(screen.getByRole("button", { name: "다시 입력하기" }), ads[0])).toBe(true);
    expect(container.querySelector('[data-testid="toss-reward-ad"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/reward-ad/i);
  });

  it("AC-8: Empty 분기에서도 AdSlot은 맨 아래 1개다", () => {
    renderResult();
    expect(screen.getAllByTestId("ad-slot")).toHaveLength(1);
    expect(screen.getByText("입력한 연봉이 부족해요")).toBeInTheDocument();
  });

  it("AC-9: VITE_TOSS_AD_GROUP_ID가 비어도 본문이 모두 보이고 Toast·console.error는 0회", () => {
    vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "");
    seed(FIXTURE);
    renderResult();
    expect(screen.getByText("올해(2026) 목표 연봉")).toBeInTheDocument();
    expect(screen.getByText(/첫 해\(2021\) 대비 구매력/)).toBeInTheDocument();
    expect(screen.getAllByTestId("bar-nominal").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("share-btn")).toBeInTheDocument();
    expect(mockOpenToast).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(within(document.body).queryByText("결과를 불러오지 못했어요")).toBeNull();
  });
});
