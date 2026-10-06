import { describe, it, expect, vi } from "vitest";
import type { CpiData } from "@/lib/types";
import {
  calculate,
  formatSignedPct,
  parseAmountInput,
  validateAmount,
} from "@/lib/calculator";

const cpi = (rates: [number, number][]): CpiData => ({
  source: "test",
  asOf: "test",
  rates: rates.map(([year, ratePct]) => ({ year, ratePct })),
});

const FIXTURE = cpi([
  [2022, 5.1],
  [2023, 3.6],
  [2024, 2.3],
  [2025, 2.1],
]);

describe("calculate", () => {
  it("AC1: 2022→2023 명목 +5.0%, 실질 +1.4%", () => {
    const result = calculate(
      [
        { year: 2022, amountMan: 4000 },
        { year: 2023, amountMan: 4200 },
      ],
      cpi([[2023, 3.6]]),
      2024,
    );
    expect(result.rows).toHaveLength(1);
    expect(formatSignedPct(result.rows[0].nominalPct)).toBe("+5.0%");
    expect(formatSignedPct(result.rows[0].realPct)).toBe("+1.4%");
  });

  it("AC2: 2021→2025 누적과 목표 연봉 (currentYear 2026)", () => {
    const result = calculate(
      [
        { year: 2021, amountMan: 4000 },
        { year: 2025, amountMan: 4400 },
      ],
      FIXTURE,
      2026,
    );
    expect(formatSignedPct(result.cumulativeRealPct)).toBe("−3.3%");
    expect(formatSignedPct(result.cumulativeNominalPct)).toBe("+10.0%");
    expect(result.keepLineWon).toBe(44880000);
    expect(result.restoreLineWon).toBe(46410000);
    expect(result.targetWon).toBe(46410000);
    expect(formatSignedPct(result.requiredRaisePct)).toBe("+5.5%");
    expect(result.staleYears).toBe(1);
    expect(result.firstYear).toBe(2021);
    expect(result.lastYear).toBe(2025);
    expect(result.targetYear).toBe(2026);
  });

  it("AC3: 빈 연도는 사이 연도 물가를 연쇄해서 곱한다", () => {
    const result = calculate(
      [
        { year: 2021, amountMan: 4000 },
        { year: 2023, amountMan: 4400 },
      ],
      FIXTURE,
      2024,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].gapYears).toBe(2);
    const expected = (1.1 / (1.051 * 1.036) - 1) * 100;
    expect(result.rows[0].realPct).toBeCloseTo(expected, 6);
  });

  it("AC4: currentYear 2027이면 staleYears 2, A = 4400×1.02² 만원 올림", () => {
    const result = calculate(
      [
        { year: 2021, amountMan: 4000 },
        { year: 2025, amountMan: 4400 },
      ],
      FIXTURE,
      2027,
    );
    expect(result.staleYears).toBe(2);
    expect(result.keepLineWon).toBe(Math.ceil(4400 * 1.02 * 1.02) * 10000);
  });

  it("AC5: 4488.000000000001은 4489가 아니라 4488만원", () => {
    const result = calculate(
      [
        { year: 2025, amountMan: 4400 },
        { year: 2026, amountMan: 4400 },
      ],
      cpi([[2026, 2.0]]),
      2027,
    );
    expect(result.keepLineWon).toBe(44880000);
  });

  it("n=2: 연도가 정확히 2개여도 행 1개로 계산된다", () => {
    const result = calculate(
      [
        { year: 2024, amountMan: 5000 },
        { year: 2025, amountMan: 5000 },
      ],
      FIXTURE,
      2025,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.staleYears).toBe(0);
    expect(formatSignedPct(result.rows[0].nominalPct)).toBe("+0.0%");
    expect(formatSignedPct(result.rows[0].realPct)).toBe("−2.1%");
  });

  it("입력 순서와 상관없이 연도 오름차순으로 행을 만들고 메모를 채운다", () => {
    const result = calculate(
      [
        { year: 2024, amountMan: 4300, memo: "이직" },
        { year: 2022, amountMan: 4000, memo: "입사" },
        { year: 2023, amountMan: 4100 },
      ],
      FIXTURE,
      2025,
    );
    expect(result.rows.map((r) => [r.fromYear, r.toYear])).toEqual([
      [2022, 2023],
      [2023, 2024],
    ]);
    expect(result.rows[0].fromMemo).toBe("입사");
    expect(result.rows[0].toMemo).toBeUndefined();
    expect(result.rows[1].toMemo).toBe("이직");
  });

  it("AC8: 항목이 2개 미만이면 throw, console.error는 부르지 않는다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => calculate([{ year: 2022, amountMan: 4000 }], FIXTURE, 2026)).toThrow();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("AC8: 필요한 연도의 rate가 없으면 throw", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      calculate(
        [
          { year: 2021, amountMan: 4000 },
          { year: 2023, amountMan: 4400 },
        ],
        cpi([[2023, 3.6]]),
        2024,
      ),
    ).toThrow();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("parseAmountInput", () => {
  it("콤마·앞자리 0을 정리한다", () => {
    expect(parseAmountInput("4,200")).toEqual({ accept: true, value: 4200 });
    expect(parseAmountInput("0042")).toEqual({ accept: true, value: 42 });
  });

  it("빈 칸은 null", () => {
    expect(parseAmountInput("")).toEqual({ accept: true, value: null });
  });

  it("숫자·콤마 외 문자는 거부한다", () => {
    for (const raw of ["4200.5", "4$00", "abc", "-5000", " 42"]) {
      expect(parseAmountInput(raw)).toEqual({ accept: false });
    }
  });
});

describe("validateAmount", () => {
  it("정수 1~100000만 통과", () => {
    for (const n of [0, 100001, -1, 4200.5]) expect(validateAmount(n)).toBe(false);
    for (const n of [1, 100000]) expect(validateAmount(n)).toBe(true);
  });
});

describe("formatSignedPct", () => {
  it("부호와 소수 1자리", () => {
    expect(formatSignedPct(5)).toBe("+5.0%");
    expect(formatSignedPct(-3.277)).toBe("−3.3%");
  });

  it("반올림 결과가 0이면 +0.0%", () => {
    expect(formatSignedPct(0)).toBe("+0.0%");
    expect(formatSignedPct(-0.04)).toBe("+0.0%");
  });
});
