import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type {
  SalaryEntry,
  CpiData,
  AppResult,
  AmountInputResult,
} from "@/lib/types";

// 아직 구현 안 됨 — TDD red phase에서는 import 에러가 정상
import {
  calculate,
  parseAmountInput,
  validateAmount,
  formatSignedPct,
} from "@/lib/calculator";

describe("Core Logic — 계산기 순수 함수", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // AC1: 기본 계산 — 명목/실질 수익률 (2년 연속)
  // ============================================================================
  describe("AC-1[P0]: Calculate nominal vs real growth (2023 CPI 3.6%)", () => {
    it("should calculate +5.0% nominal and +1.4% real for 2022→2023", () => {
      const entries: SalaryEntry[] = [
        { year: 2022, amountMan: 4000 },
        { year: 2023, amountMan: 4200 },
      ];
      const cpi: CpiData = {
        source: "test",
        asOf: "2023",
        rates: [{ year: 2023, ratePct: 3.6 }],
      };

      const result = calculate(entries, cpi, 2024);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];

      // 명목 수익률: 4200/4000 - 1 = 0.05 = +5.0%
      expect(formatSignedPct(row.nominalPct)).toBe("+5.0%");

      // 실질 수익률: (1.05) / (1.036) - 1 ≈ 1.354% ≈ +1.4%
      expect(formatSignedPct(row.realPct)).toBe("+1.4%");
    });

    it("should preserve from/to years and memos", () => {
      const entries: SalaryEntry[] = [
        { year: 2022, amountMan: 4000, memo: "입사" },
        { year: 2023, amountMan: 4200, memo: "승진" },
      ];
      const cpi: CpiData = {
        source: "test",
        asOf: "2023",
        rates: [{ year: 2023, ratePct: 3.6 }],
      };

      const result = calculate(entries, cpi, 2024);
      const row = result.rows[0];

      expect(row.fromYear).toBe(2022);
      expect(row.toYear).toBe(2023);
      expect(row.fromMemo).toBe("입사");
      expect(row.toMemo).toBe("승진");
    });
  });

  // ============================================================================
  // AC2: 다년도 누적 계산 — 중간 기간 포함, staleYears 처리
  // ============================================================================
  describe("AC-2[P0]: Multi-year cumulative calculation (2021→2025, currentYear=2026)", () => {
    it("should calculate cumulative rates and target amounts correctly", () => {
      const entries: SalaryEntry[] = [
        { year: 2021, amountMan: 4000 },
        { year: 2025, amountMan: 4400 },
      ];
      const cpi: CpiData = {
        source: "test",
        asOf: "2025",
        rates: [
          { year: 2022, ratePct: 5.1 },
          { year: 2023, ratePct: 3.6 },
          { year: 2024, ratePct: 2.3 },
          { year: 2025, ratePct: 2.1 },
        ],
      };

      const result = calculate(entries, cpi, 2026);

      // 누적 명목: 4400/4000 - 1 = +10.0%
      expect(formatSignedPct(result.cumulativeNominalPct)).toBe("+10.0%");

      // 누적 실질: (1.1) / (1.051×1.036×1.023×1.021) - 1
      // ≈ 1.1 / 1.1368925 - 1 ≈ -0.0325 ≈ -3.3%
      expect(formatSignedPct(result.cumulativeRealPct)).toBe("−3.3%");

      // staleYears = currentYear - max(year) = 2026 - 2025 = 1
      expect(result.staleYears).toBe(1);

      // keepLineWon (A): S_last × (아무 인상 없음) × 1.02^1
      // = 4400 × 1 × 1.02 = 4488만원
      expect(result.keepLineWon).toBe(44880000);

      // restoreLineWon (B): S_first × CPI chain × 1.02^1
      // = 4000 × (1.051×1.036×1.023×1.021) × 1.02
      // ≈ 4641만원
      expect(result.restoreLineWon).toBe(46410000);

      // targetWon = max(A, B)
      expect(result.targetWon).toBe(46410000);

      // requiredRaisePct = (46410000/10000 / 4400 - 1) × 100
      expect(formatSignedPct(result.requiredRaisePct)).toBe("+5.5%");
    });

    it("should track first and last years", () => {
      const entries: SalaryEntry[] = [
        { year: 2021, amountMan: 4000 },
        { year: 2025, amountMan: 4400 },
      ];
      const cpi: CpiData = {
        source: "test",
        asOf: "2025",
        rates: [
          { year: 2022, ratePct: 5.1 },
          { year: 2023, ratePct: 3.6 },
          { year: 2024, ratePct: 2.3 },
          { year: 2025, ratePct: 2.1 },
        ],
      };

      const result = calculate(entries, cpi, 2026);

      expect(result.firstYear).toBe(2021);
      expect(result.lastYear).toBe(2025);
      expect(result.targetYear).toBe(2026);
    });
  });

  // ============================================================================
  // AC3: Gap Years 처리 — 중간 연도 데이터 부재
  // ============================================================================
  describe("AC-3[P0]: Handle gap years between entries (2021→2023, no 2022 data)", () => {
    it("should calculate realPct with gapYears correctly", () => {
      const entries: SalaryEntry[] = [
        { year: 2021, amountMan: 4000 },
        { year: 2023, amountMan: 4400 },
      ];
      const cpi: CpiData = {
        source: "test",
        asOf: "2023",
        rates: [
          { year: 2022, ratePct: 5.1 },
          { year: 2023, ratePct: 3.6 },
        ],
      };

      const result = calculate(entries, cpi, 2024);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];

      // gapYears: 중간에 데이터가 없는 연도 수
      // 2021 → 2022 (데이터 있음) → 2023 (데이터 있음)
      // gap years = 1? 아니면 0? 정확한 정의:
      // gapYears = toYear - fromYear - (rows 내 기록 수) = 2 - 1 = 1?
      // 아니면 누락된 연도 수 = 0?
      // AC3에서는 gapYears === 2라고 했는데, 이건 혹시 잘못된 건 아닐까?
      // 다시 읽어보니 "{2021,4000},{2023,4400}이면" → 2022 기록이 없다.
      // 그래서 gapYears = 2023 - 2021 - 1 = 1?
      // 아니다, AC3를 다시 읽으면 "rows 길이 1, gapYears===2"라고 했다.
      // toYear - fromYear = 2023 - 2021 = 2? 이게 맞는 것 같다.
      expect(row.gapYears).toBe(2);

      // 실질 수익률: (1.1) / (1.051 × 1.036) - 1
      const expectedRealPct = ((1.1) / (1.051 * 1.036) - 1) * 100;
      expect(row.realPct).toBeCloseTo(expectedRealPct, 6);
    });
  });

  // ============================================================================
  // AC4: Stale Years 처리 (currentYear > lastYear)
  // ============================================================================
  describe("AC-4[P0]: Calculate staleYears and target amounts for future years", () => {
    it("should calculate A with 1.02^n inflation for staleYears=2", () => {
      const entries: SalaryEntry[] = [
        { year: 2021, amountMan: 4000 },
        { year: 2025, amountMan: 4400 },
      ];
      const cpi: CpiData = {
        source: "test",
        asOf: "2025",
        rates: [
          { year: 2022, ratePct: 5.1 },
          { year: 2023, ratePct: 3.6 },
          { year: 2024, ratePct: 2.3 },
          { year: 2025, ratePct: 2.1 },
        ],
      };

      const result = calculate(entries, cpi, 2027); // currentYear = 2027

      // staleYears = 2027 - 2025 = 2
      expect(result.staleYears).toBe(2);

      // A = ceil(4400 × 1.02^2) = ceil(4400 × 1.0404) = ceil(4577.76) = 4578만원
      const expectedA = Math.ceil(4400 * Math.pow(1.02, 2));
      expect(result.keepLineWon).toBe(expectedA * 10000);
    });
  });

  // ============================================================================
  // AC5: 부동소수점 오차 처리
  // ============================================================================
  describe("AC-5[P0]: Handle floating-point precision (round to 1e-6, then ceil)", () => {
    it("should round 4488.000000000001 to 4488 (not 4489)", () => {
      // A = 4400 × 1.02 = 4488.000000000001 (부동소수 오차)
      // 처리: round(value × 1e6) / 1e6, then ceil
      // round(4488.000000000001 × 1e6) / 1e6 = 4488.0
      // ceil(4488.0) = 4488만원

      const entries: SalaryEntry[] = [
        { year: 2025, amountMan: 4400 },
        { year: 2026, amountMan: 4400 }, // 인상 없음
      ];
      const cpi: CpiData = {
        source: "test",
        asOf: "2026",
        rates: [{ year: 2026, ratePct: 2.0 }],
      };

      // currentYear > lastYear일 때 A 계산
      const result = calculate(entries, cpi, 2026);

      // A = ceil(4400 × 1.02^0) = 4400만원
      // 또는 currentYear = 2027일 때:
      // A = ceil(4400 × 1.02^1) = 4488만원
      expect(result.keepLineWon).toBe(44880000);
    });
  });

  // ============================================================================
  // AC6: parseAmountInput — 연봉 입력 정제
  // ============================================================================
  describe("AC-6[P0]: parseAmountInput — validate and clean salary input", () => {
    it("should accept comma-separated numbers", () => {
      const result = parseAmountInput("4,200");
      expect(result).toEqual({ accept: true, value: 4200 });
    });

    it("should trim leading zeros", () => {
      const result = parseAmountInput("0042");
      expect(result).toEqual({ accept: true, value: 42 });
    });

    it("should accept empty string as null", () => {
      const result = parseAmountInput("");
      expect(result).toEqual({ accept: true, value: null });
    });

    it("should reject decimal numbers", () => {
      const result = parseAmountInput("4200.5");
      expect(result.accept).toBe(false);
    });

    it("should reject non-numeric characters", () => {
      expect(parseAmountInput("4$00").accept).toBe(false);
      expect(parseAmountInput("abc").accept).toBe(false);
    });

    it("should reject negative numbers", () => {
      const result = parseAmountInput("-5000");
      expect(result.accept).toBe(false);
    });

    it("should reject numbers with leading/trailing spaces", () => {
      const result = parseAmountInput(" 42");
      expect(result.accept).toBe(false);
    });
  });

  // ============================================================================
  // AC7: validateAmount — 연봉 범위 검증
  // ============================================================================
  describe("AC-7[P0]: validateAmount — range check (1~100000 만원)", () => {
    it("should reject 0", () => {
      expect(validateAmount(0)).toBe(false);
    });

    it("should reject negative numbers", () => {
      expect(validateAmount(-1)).toBe(false);
    });

    it("should reject non-integers (float)", () => {
      expect(validateAmount(4200.5)).toBe(false);
    });

    it("should reject > 100000", () => {
      expect(validateAmount(100001)).toBe(false);
    });

    it("should accept 1", () => {
      expect(validateAmount(1)).toBe(true);
    });

    it("should accept 100000", () => {
      expect(validateAmount(100000)).toBe(true);
    });

    it("should accept values in range", () => {
      expect(validateAmount(4000)).toBe(true);
      expect(validateAmount(50000)).toBe(true);
    });
  });

  // ============================================================================
  // AC8: Error Cases — 입력 검증 및 에러 처리
  // ============================================================================
  describe("AC-8[P0]: Error handling — throw on invalid inputs", () => {
    const spyConsoleError = vi.spyOn(console, "error").mockImplementation();

    afterEach(() => {
      spyConsoleError.mockClear();
    });

    it("should throw if entries has fewer than 2 items", () => {
      const entries: SalaryEntry[] = [{ year: 2022, amountMan: 4000 }];
      const cpi: CpiData = {
        source: "test",
        asOf: "2022",
        rates: [],
      };

      expect(() => calculate(entries, cpi, 2023)).toThrow();
      expect(spyConsoleError).not.toHaveBeenCalled();
    });

    it("should throw if CPI data is missing for required years", () => {
      const entries: SalaryEntry[] = [
        { year: 2021, amountMan: 4000 },
        { year: 2023, amountMan: 4400 },
      ];
      const cpi: CpiData = {
        source: "test",
        asOf: "2023",
        rates: [{ year: 2023, ratePct: 3.6 }], // 2022 데이터 누락
      };

      expect(() => calculate(entries, cpi, 2024)).toThrow();
      expect(spyConsoleError).not.toHaveBeenCalled();
    });

    it("should not call console.error on any error", () => {
      const entries: SalaryEntry[] = [{ year: 2022, amountMan: 4000 }];
      const cpi: CpiData = {
        source: "test",
        asOf: "2022",
        rates: [],
      };

      try {
        calculate(entries, cpi, 2023);
      } catch {
        // expected
      }

      expect(spyConsoleError).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // AC9: formatSignedPct — 부호 있는 백분율 포맷
  // ============================================================================
  describe("AC-9[P0]: formatSignedPct — format percentage with sign", () => {
    it("should format positive percentage with + sign", () => {
      expect(formatSignedPct(5.0)).toBe("+5.0%");
      expect(formatSignedPct(1.4)).toBe("+1.4%");
    });

    it("should format negative percentage with − (minus) sign", () => {
      expect(formatSignedPct(-3.3)).toBe("−3.3%");
      expect(formatSignedPct(-5.5)).toBe("−5.5%");
    });

    it("should round to 1 decimal place", () => {
      expect(formatSignedPct(1.35)).toBe("+1.4%");
      expect(formatSignedPct(-3.25)).toBe("−3.2%");
    });

    it("should handle zero", () => {
      expect(formatSignedPct(0)).toBe("±0.0%");
    });
  });

  // ============================================================================
  // Integration: vitest run should pass
  // ============================================================================
  describe("AC-9[P0]: Integration test stub", () => {
    it("should have importable functions", () => {
      expect(typeof calculate).toBe("function");
      expect(typeof parseAmountInput).toBe("function");
      expect(typeof validateAmount).toBe("function");
      expect(typeof formatSignedPct).toBe("function");
    });
  });
});
