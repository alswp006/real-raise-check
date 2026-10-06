import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mockTds, mockOpenToast } from "@/__tests__/__helpers__/mocks";
import type { AppResult, CpiData } from "@/lib/types";
import { renderShareCard, saveShareImage } from "@/lib/shareCard";
import { ShareCardButton } from "@/components/ShareCardButton";
import * as shareCardModule from "@/lib/shareCard";

mockTds();

// 컴포넌트 테스트에서만 renderShareCard를 스파이로 바꾼다(원본은 그대로 노출 — 순수 함수 테스트는 원본을 쓴다).
vi.mock("@/lib/shareCard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/shareCard")>();
  return { ...actual, renderShareCard: vi.fn(actual.renderShareCard) };
});

// 계약(코더용):
//  · 캔버스는 document.createElement("canvas") → width/height 1080×1350 → getContext("2d") → toBlob(cb, "image/png").
//  · 텍스트는 ctx.fillText(문자열, x, y)로만 그린다(문자열 하나에 한 덩어리 — 부분 문자열 매칭).
//  · 필요 인상률 = formatSignedPct(requiredRaisePct), 누적 구매력 변화율 = formatSignedPct(cumulativeRealPct).
//  · 금액(showAmount=true) = `${formatNumber(targetWon)}원` 형태('46,410,000원').
//  · ShareCardButton은 @/data/cpi의 cpi를 renderShareCard에 넘기고, 토스트는 useToast().openToast(문구)로 띄운다.
//  · 저장 순서: navigator.canShare?.({files})가 true면 navigator.share({files}), 아니면 a[download] 클릭.

const cpi: CpiData = {
  source: "통계청 소비자물가지수 연간 상승률(KOSIS)",
  asOf: "2025년 연간",
  rates: [
    { year: 2022, ratePct: 5.1 },
    { year: 2023, ratePct: 3.6 },
    { year: 2024, ratePct: 2.3 },
  ],
};

const prow = (fromYear: number, realPct: number, nominalPct: number) => ({
  fromYear,
  toYear: fromYear + 1,
  gapYears: 1,
  nominalPct,
  realPct,
});

const result: AppResult = {
  rows: [
    prow(2019, 0.6, 3.1),
    prow(2020, 1.2, 4.2),
    prow(2021, -2.8, 2.9),
    prow(2022, 3.7, 8.0),
    prow(2023, 5.1, 7.5),
  ],
  cumulativeRealPct: -6.9,
  cumulativeNominalPct: 12.4,
  firstYear: 2019,
  lastYear: 2024,
  targetYear: 2025,
  keepLineWon: 45000000,
  restoreLineWon: 46410000,
  targetWon: 46410000,
  requiredRaisePct: 9.4,
  staleYears: 1,
};

// ── canvas 목: fillText 호출과 크기를 기록한다 ──
let fillTexts: string[] = [];
let canvasSizes: { w: number; h: number }[] = [];
let toBlobTypes: (string | undefined)[] = [];

function installCanvas() {
  fillTexts = [];
  canvasSizes = [];
  toBlobTypes = [];
  const ctx = new Proxy(
    { fillText: (t: string) => fillTexts.push(String(t)), measureText: (t: string) => ({ width: String(t).length * 10 }) },
    {
      get(target: any, prop: string) {
        if (prop in target) return target[prop];
        return () => {}; // fillRect, beginPath, arc, ... 전부 no-op
      },
      set() {
        return true; // fillStyle, font 등 대입 허용
      },
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    canvasSizes.push({ w: this.width, h: this.height });
    return ctx as unknown as CanvasRenderingContext2D;
  } as any);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb: BlobCallback, type?: string) {
    toBlobTypes.push(type);
    cb(new Blob(["png"], { type: type ?? "image/png" }));
  } as any);
}

function installNavigator(opts: { canShare?: boolean | undefined; share?: (() => Promise<void>) | undefined }) {
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: opts.canShare === undefined ? undefined : vi.fn(() => opts.canShare),
  });
  Object.defineProperty(navigator, "share", { configurable: true, value: opts.share });
}

beforeEach(() => {
  installCanvas();
  (URL as any).createObjectURL = vi.fn(() => "blob:real-raise-check");
  (URL as any).revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  installNavigator({});
});

describe("공유 카드 (Canvas PNG + ShareCardButton)", () => {
  it("AC-1: renderShareCard가 1080×1350 canvas에서 image/png Blob을 반환한다", async () => {
    const blob = await renderShareCard(result, { showAmount: false, cpi });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(canvasSizes.length).toBeGreaterThanOrEqual(1);
    expect(canvasSizes[0]).toEqual({ w: 1080, h: 1350 });
    expect(toBlobTypes).toContain("image/png");
  });

  it("AC-2: 앱 이름·누적 변화율·필요 인상률·최근 4행 실질 인상률·출처가 모두 그려진다", async () => {
    await renderShareCard(result, { showAmount: false, cpi });
    const all = fillTexts.join("\n");
    expect(all).toContain("진짜연봉체크");
    expect(all).toContain("−6.9%"); // formatSignedPct(cumulativeRealPct)
    expect(all).toContain("+9.4%"); // formatSignedPct(requiredRaisePct)
    for (const s of ["+1.2%", "−2.8%", "+3.7%", "+5.1%"]) expect(all).toContain(s);
    expect(all).not.toContain("+0.6%"); // 5행 중 최근 4행만
    expect(fillTexts).toContain("출처: 통계청 소비자물가지수 연간 상승률(KOSIS) · 2025년 연간 기준");
  });

  it("AC-3[P0]: showAmount=false면 'N원' 문자열이 0개, true면 '46,410,000원'이 있다", async () => {
    await renderShareCard(result, { showAmount: false, cpi });
    expect(fillTexts.filter((t) => /\d[\d,]*원/.test(t))).toHaveLength(0);

    fillTexts.length = 0;
    await renderShareCard(result, { showAmount: true, cpi });
    expect(fillTexts.filter((t) => t.includes("46,410,000원")).length).toBeGreaterThanOrEqual(1);
    expect(fillTexts.join("\n")).toContain("진짜연봉체크");
  });

  it("AC-4[P0]: canShare가 true면 share 1회, false·없음이면 download 링크 click 1회, 둘 다 성공 문구", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });

    const share = vi.fn(async () => {});
    installNavigator({ canShare: true, share });
    await expect(saveShareImage(blob)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
    expect(clicked).toHaveLength(0);

    installNavigator({ canShare: false, share });
    await expect(saveShareImage(blob)).resolves.toBe("downloaded");
    expect(share).toHaveBeenCalledTimes(1);
    expect(clicked).toEqual(["real-raise-check.png"]);

    installNavigator({}); // canShare·share 자체가 없는 환경
    await expect(saveShareImage(blob)).resolves.toBe("downloaded");
    expect(clicked).toEqual(["real-raise-check.png", "real-raise-check.png"]);
  });

  it("AC-4: 컴포넌트 — 저장 성공 시 '이미지를 저장했어요' Toast", async () => {
    installNavigator({ canShare: true, share: vi.fn(async () => {}) });
    render(React.createElement(MemoryRouter, null, React.createElement(ShareCardButton, { result, showAmount: false })));
    fireEvent.click(screen.getByRole("button", { name: /공유 카드 저장/ }));
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledTimes(1));
    expect(mockOpenToast).toHaveBeenCalledWith("이미지를 저장했어요");
  });

  it("AC-5[P0]: AbortError는 Toast 0개, 그 밖의 예외는 실패 Toast 1회 + console.error 0회", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const abort = Object.assign(new Error("cancelled"), { name: "AbortError" });
    installNavigator({ canShare: true, share: vi.fn(async () => { throw abort; }) });

    // 순수 함수: AbortError → 'aborted'(throw 아님)
    await expect(saveShareImage(new Blob(["png"], { type: "image/png" }))).resolves.toBe("aborted");

    const { unmount } = render(
      React.createElement(MemoryRouter, null, React.createElement(ShareCardButton, { result, showAmount: false })),
    );
    fireEvent.click(screen.getByRole("button", { name: /공유 카드 저장/ }));
    await waitFor(() => expect(shareCardModule.renderShareCard).toHaveBeenCalledTimes(1));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(mockOpenToast).toHaveBeenCalledTimes(0);
    unmount();

    installNavigator({ canShare: true, share: vi.fn(async () => { throw new Error("boom"); }) });
    render(React.createElement(MemoryRouter, null, React.createElement(ShareCardButton, { result, showAmount: false })));
    fireEvent.click(screen.getByRole("button", { name: /공유 카드 저장/ }));
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledTimes(1));
    expect(mockOpenToast).toHaveBeenCalledWith("저장하지 못했어요. 다시 시도해 주세요");
    expect(errSpy).toHaveBeenCalledTimes(0);
  });

  it("AC-6: 생성 중에는 버튼이 막히고 다시 눌러도 renderShareCard는 1회뿐이다", async () => {
    let release!: (b: Blob) => void;
    vi.mocked(shareCardModule.renderShareCard).mockImplementation(
      () => new Promise<Blob>((r) => { release = r; }),
    );
    installNavigator({ canShare: true, share: vi.fn(async () => {}) });
    render(React.createElement(MemoryRouter, null, React.createElement(ShareCardButton, { result, showAmount: true })));

    const btn = screen.getByRole("button", { name: /공유 카드 저장/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(shareCardModule.renderShareCard).toHaveBeenCalledTimes(1);
    expect(vi.mocked(shareCardModule.renderShareCard).mock.calls[0][1]).toMatchObject({ showAmount: true });

    await act(async () => { release(new Blob(["png"], { type: "image/png" })); });
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith("이미지를 저장했어요"));
    expect(shareCardModule.renderShareCard).toHaveBeenCalledTimes(1);
  });

  it("AC-7: 두 파일 모두 HEX 색 문자열이 0개다", () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/g;
    for (const f of ["src/lib/shareCard.ts", "src/components/ShareCardButton.tsx"]) {
      const src = readFileSync(resolve(process.cwd(), f), "utf8");
      expect(src.match(hex) ?? []).toEqual([]);
    }
  });
});
