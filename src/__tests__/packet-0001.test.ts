import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type {
  SalaryEntry,
  CpiData,
  PairRow,
  AppResult,
  AmountInputResult,
  SaveResult,
  LoadResult,
} from "@/lib/types";
import { cpi, getSlotYears, getLatestCpiYear } from "@/data/cpi";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Types & Constants (packet-0001)", () => {
  describe("AC-1: Type exports", () => {
    it("AC-1[P0]: should export SalaryEntry type", () => {
      type TestType = SalaryEntry;
      expect(TestType).toBeDefined();
    });

    it("AC-1[P0]: should export CpiData type", () => {
      type TestType = CpiData;
      expect(TestType).toBeDefined();
    });

    it("AC-1[P0]: should export PairRow type", () => {
      type TestType = PairRow;
      expect(TestType).toBeDefined();
    });

    it("AC-1[P0]: should export AppResult type", () => {
      type TestType = AppResult;
      expect(TestType).toBeDefined();
    });

    it("AC-1[P0]: should export AmountInputResult type", () => {
      type TestType = AmountInputResult;
      expect(TestType).toBeDefined();
    });

    it("AC-1[P0]: should export SaveResult type", () => {
      type TestType = SaveResult;
      expect(TestType).toBeDefined();
    });

    it("AC-1[P0]: should export LoadResult type", () => {
      type TestType = LoadResult;
      expect(TestType).toBeDefined();
    });
  });

  describe("AC-2: LoadResult discriminated union shape", () => {
    it("AC-2[P0]: LoadResult with ok=true should have entries array", () => {
      const success: LoadResult = { ok: true, entries: [] };
      expect(success.ok).toBe(true);
      if (success.ok) {
        expect(Array.isArray(success.entries)).toBe(true);
        expect(success.entries).toEqual([]);
      }
    });

    it("AC-2[P0]: LoadResult with ok=false should only have ok field", () => {
      const failure: LoadResult = { ok: false };
      expect(failure.ok).toBe(false);
      expect(Object.keys(failure)).toEqual(["ok"]);
    });
  });

  describe("AC-2b: AmountInputResult discriminated union shape", () => {
    it("AC-2b[P0]: AmountInputResult with accept=false should not have value", () => {
      const reject: AmountInputResult = { accept: false };
      expect(reject.accept).toBe(false);
      expect(Object.keys(reject)).toEqual(["accept"]);
    });

    it("AC-2b[P0]: AmountInputResult with accept=true should have value as number", () => {
      const acceptNum: AmountInputResult = { accept: true, value: 5000000 };
      expect(acceptNum.accept).toBe(true);
      expect(acceptNum.value).toBe(5000000);
    });

    it("AC-2b[P0]: AmountInputResult with accept=true should allow value as null", () => {
      const acceptNull: AmountInputResult = { accept: true, value: null };
      expect(acceptNull.accept).toBe(true);
      expect(acceptNull.value).toBeNull();
    });
  });

  describe("AC-3: CPI data metadata", () => {
    it("AC-3[P0]: cpi.source should be exactly '통계청 소비자물가지수 연간 상승률(KOSIS)'", () => {
      expect(cpi.source).toBe("통계청 소비자물가지수 연간 상승률(KOSIS)");
    });

    it("AC-3[P0]: cpi.asOf should be exactly '2025년 연간'", () => {
      expect(cpi.asOf).toBe("2025년 연간");
    });
  });

  describe("AC-3: CPI rates data", () => {
    it("AC-3[P0]: cpi.rates should have exactly 5 items", () => {
      expect(cpi.rates).toHaveLength(5);
    });

    it("AC-3[P0]: cpi.rates should contain 2021 with ratePct=2.5", () => {
      const rate2021 = cpi.rates.find((r) => r.year === 2021);
      expect(rate2021).toBeDefined();
      expect(rate2021?.ratePct).toBe(2.5);
    });

    it("AC-3[P0]: cpi.rates should contain 2022 with ratePct=5.1", () => {
      const rate2022 = cpi.rates.find((r) => r.year === 2022);
      expect(rate2022).toBeDefined();
      expect(rate2022?.ratePct).toBe(5.1);
    });

    it("AC-3[P0]: cpi.rates should contain 2023 with ratePct=3.6", () => {
      const rate2023 = cpi.rates.find((r) => r.year === 2023);
      expect(rate2023).toBeDefined();
      expect(rate2023?.ratePct).toBe(3.6);
    });

    it("AC-3[P0]: cpi.rates should contain 2024 with ratePct=2.3", () => {
      const rate2024 = cpi.rates.find((r) => r.year === 2024);
      expect(rate2024).toBeDefined();
      expect(rate2024?.ratePct).toBe(2.3);
    });

    it("AC-3[P0]: cpi.rates should contain 2025 with ratePct=2.1", () => {
      const rate2025 = cpi.rates.find((r) => r.year === 2025);
      expect(rate2025).toBeDefined();
      expect(rate2025?.ratePct).toBe(2.1);
    });

    it("AC-3[P0]: cpi.rates should have all 5 years (2021-2025) present", () => {
      const years = cpi.rates.map((r) => r.year);
      expect(years).toContain(2021);
      expect(years).toContain(2022);
      expect(years).toContain(2023);
      expect(years).toContain(2024);
      expect(years).toContain(2025);
    });
  });

  describe("AC-4: getSlotYears() function", () => {
    it("AC-4[P0]: getSlotYears() should return latest 5 years in ascending order", () => {
      const years = getSlotYears();
      expect(years).toEqual([2021, 2022, 2023, 2024, 2025]);
    });

    it("AC-4[P0]: getSlotYears() should return 5 items", () => {
      const years = getSlotYears();
      expect(years).toHaveLength(5);
    });

    it("AC-4[P0]: getSlotYears() should return numbers in ascending order", () => {
      const years = getSlotYears();
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i]).toBeLessThan(years[i + 1]);
      }
    });
  });

  describe("AC-5: getLatestCpiYear() function", () => {
    it("AC-5[P0]: getLatestCpiYear() should return 2025", () => {
      expect(getLatestCpiYear()).toBe(2025);
    });

    it("AC-5[P0]: getLatestCpiYear() should return the maximum year from rates", () => {
      const maxYear = Math.max(...cpi.rates.map((r) => r.year));
      expect(getLatestCpiYear()).toBe(maxYear);
    });
  });

  describe("AC-6: cpi.ts source file comments", () => {
    it("AC-6[P0]: cpi.ts should have required comment about KOSIS verification", () => {
      const cpiPath = join(__dirname, "../data/cpi.ts");
      const content = readFileSync(cpiPath, "utf-8");

      expect(content).toContain("출시 전 KOSIS 원자료 대조 필요");
      expect(content).toContain("2025 값 확인 필요");
      expect(content).toContain("조회일:");
    });
  });

  describe("Integration: Type consistency", () => {
    it("CpiData.rates elements should match expected shape (year + ratePct)", () => {
      cpi.rates.forEach((rate) => {
        expect(typeof rate.year).toBe("number");
        expect(typeof rate.ratePct).toBe("number");
        expect(rate.year).toBeGreaterThan(2000);
        expect(rate.ratePct).toBeGreaterThan(0);
      });
    });
  });
});
