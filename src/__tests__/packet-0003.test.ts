import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SalaryEntry, LoadResult, SaveResult } from "@/lib/types";
import * as entriesStore from "@/lib/entriesStore";
import { cpi } from "@/data/cpi";

const STORAGE_KEY = "real-raise-check:v1:entries";

describe("entriesStore (localStorage + 메모리 사본)", () => {
  beforeEach(() => {
    localStorage.clear();
    entriesStore.__resetForTest();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("AC-1: save & load roundtrip", () => {
    it("should save entries to localStorage and load them correctly after memory reset", () => {
      const entries: SalaryEntry[] = [
        { year: 2022, amountMan: 4000, memo: "이직" },
        { year: 2023, amountMan: 4200 },
      ];

      // Save
      const saveResult = entriesStore.save(entries);
      expect(saveResult.ok).toBe(true);

      // Verify localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeDefined();
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ year: 2022, amountMan: 4000, memo: "이직" });
      expect(parsed[1]).toEqual({ year: 2023, amountMan: 4200 }); // memo 필드 생략됨

      // Reset memory and load
      entriesStore.__resetForTest();
      const loadResult = entriesStore.load();
      expect(loadResult.ok).toBe(true);
      if (loadResult.ok) {
        expect(loadResult.entries).toHaveLength(2);
        expect(loadResult.entries[0]).toEqual({ year: 2022, amountMan: 4000, memo: "이직" });
        expect(loadResult.entries[1]).toEqual({ year: 2023, amountMan: 4200 });
      }
    });

    it("should sort entries by year ascending when saving", () => {
      const entries: SalaryEntry[] = [
        { year: 2023, amountMan: 4200 },
        { year: 2021, amountMan: 3800 },
        { year: 2022, amountMan: 4000 },
      ];

      entriesStore.save(entries);
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);

      expect(parsed[0].year).toBe(2021);
      expect(parsed[1].year).toBe(2022);
      expect(parsed[2].year).toBe(2023);
    });
  });

  describe("AC-2: filter invalid entries", () => {
    it("should exclude entries with invalid amountMan (0, >100000, null) or unknown year", () => {
      const entries: any[] = [
        { year: 2022, amountMan: 4000 }, // valid
        { year: 2023, amountMan: 0 }, // invalid: amountMan = 0
        { year: 2024, amountMan: 100001 }, // invalid: amountMan > 100000
        { year: 2025, amountMan: null }, // invalid: amountMan = null
        { year: 1900, amountMan: 5000 }, // invalid: year not in cpi.rates
        { year: 2026, amountMan: 5000 }, // invalid: year not in cpi.rates (2025 is latest)
      ];

      const saveResult = entriesStore.save(entries);
      expect(saveResult.ok).toBe(true);

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual({ year: 2022, amountMan: 4000 });
    });

    it("should include entries with valid amountMan (1 to 100000) in cpi.rates years", () => {
      const entries: SalaryEntry[] = [
        { year: 2021, amountMan: 1 }, // valid: min
        { year: 2022, amountMan: 100000 }, // valid: max
        { year: 2023, amountMan: 50000 }, // valid: middle
      ];

      entriesStore.save(entries);
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);

      expect(parsed).toHaveLength(3);
      expect(parsed[0].amountMan).toBe(1);
      expect(parsed[1].amountMan).toBe(100000);
      expect(parsed[2].amountMan).toBe(50000);
    });

    it("should truncate memo longer than 10 characters", () => {
      const entries: any[] = [
        { year: 2022, amountMan: 4000, memo: "12345678901" }, // 11 chars, should be invalid
      ];

      entriesStore.save(entries);
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed).toHaveLength(0); // entire entry excluded due to memo
      }
    });

    it("should accept memo with exactly 10 characters", () => {
      const entries: SalaryEntry[] = [
        { year: 2022, amountMan: 4000, memo: "1234567890" }, // exactly 10 chars
      ];

      entriesStore.save(entries);
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].memo).toBe("1234567890");
    });

    it("should omit memo field if empty string", () => {
      const entries: any[] = [
        { year: 2022, amountMan: 4000, memo: "" },
      ];

      entriesStore.save(entries);
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).not.toHaveProperty("memo");
    });
  });

  describe("AC-3: handle corrupted localStorage data", () => {
    it("should return {ok:false} and delete key when localStorage contains invalid JSON", () => {
      localStorage.setItem(STORAGE_KEY, "{bad");
      const result = entriesStore.load();
      expect(result.ok).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("should return {ok:false} and delete key when localStorage array has wrong schema (year as string)", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([{ year: "2022" }]));
      entriesStore.__resetForTest();

      const result = entriesStore.load();
      expect(result.ok).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("should return {ok:false} and delete key when memo exceeds 10 characters", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([{ year: 2022, amountMan: 4000, memo: "11chars!!!!" }]) // 11 chars
      );
      entriesStore.__resetForTest();

      const result = entriesStore.load();
      expect(result.ok).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("should return {ok:false} and delete key when amountMan is out of range", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([{ year: 2022, amountMan: 0 }]));
      entriesStore.__resetForTest();

      const result = entriesStore.load();
      expect(result.ok).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("should return {ok:false} and delete key when year is not in cpi.rates", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([{ year: 1900, amountMan: 4000 }]));
      entriesStore.__resetForTest();

      const result = entriesStore.load();
      expect(result.ok).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("AC-4: QuotaExceededError on setItem", () => {
    it("should return {ok:false} when setItem throws QuotaExceededError, keep entries in memory, and log no console.error", () => {
      const entries: SalaryEntry[] = [{ year: 2022, amountMan: 4000, memo: "test" }];

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new DOMException("QuotaExceededError");
        Object.defineProperty(err, "name", { value: "QuotaExceededError" });
        throw err;
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const saveResult = entriesStore.save(entries);
      expect(saveResult.ok).toBe(false);

      // Memory cache should still have entries
      const loadResult = entriesStore.load();
      expect(loadResult.ok).toBe(true);
      if (loadResult.ok) {
        expect(loadResult.entries).toHaveLength(1);
        expect(loadResult.entries[0]).toEqual({ year: 2022, amountMan: 4000, memo: "test" });
      }

      // console.error should not be called
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should recover memory cache on subsequent load after QuotaExceededError", () => {
      const entries: SalaryEntry[] = [
        { year: 2022, amountMan: 4000 },
        { year: 2023, amountMan: 4200 },
      ];

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new DOMException("QuotaExceededError");
        Object.defineProperty(err, "name", { value: "QuotaExceededError" });
        throw err;
      });

      entriesStore.save(entries);

      // Reset memory and try to load from localStorage (which failed)
      // Memory should still return saved entries
      const loadResult = entriesStore.load();
      expect(loadResult.ok).toBe(true);
      if (loadResult.ok) {
        expect(loadResult.entries).toHaveLength(2);
      }

      setItemSpy.mockRestore();
    });
  });

  describe("AC-5: removeItem throws on clear()", () => {
    it("should return {ok:false} when removeItem throws, and load() returns {ok:true, entries:[]}", () => {
      // First, save some entries
      const entries: SalaryEntry[] = [{ year: 2022, amountMan: 4000 }];
      entriesStore.save(entries);

      // Mock removeItem to throw
      const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("removeItem failed");
      });

      const clearResult = entriesStore.clear();
      expect(clearResult.ok).toBe(false);

      // After clear failure, memory should be reset to []
      const loadResult = entriesStore.load();
      expect(loadResult.ok).toBe(true);
      if (loadResult.ok) {
        expect(loadResult.entries).toHaveLength(0);
      }

      removeItemSpy.mockRestore();
    });

    it("should not throw console.error when removeItem fails", () => {
      const entries: SalaryEntry[] = [{ year: 2022, amountMan: 4000 }];
      entriesStore.save(entries);

      const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("removeItem failed");
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      entriesStore.clear();
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      removeItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("AC-6: empty data when key is missing", () => {
    it("should return {ok:true, entries:[]} when key is not in localStorage", () => {
      entriesStore.__resetForTest();
      const result = entriesStore.load();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.entries).toHaveLength(0);
      }
    });

    it("should maintain empty state after clear()", () => {
      // Save entries first
      entriesStore.save([{ year: 2022, amountMan: 4000 }]);

      // Clear them
      const clearResult = entriesStore.clear();
      expect(clearResult.ok).toBe(true);

      // Load should return empty
      const loadResult = entriesStore.load();
      expect(loadResult.ok).toBe(true);
      if (loadResult.ok) {
        expect(loadResult.entries).toHaveLength(0);
      }

      // localStorage key should be gone
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should return {ok:true, entries:[]} on load before any save", () => {
      const result = entriesStore.load();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.entries).toEqual([]);
      }
    });

    it("should save empty array as empty JSON array", () => {
      const saveResult = entriesStore.save([]);
      expect(saveResult.ok).toBe(true);

      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual([]);
    });

    it("should handle memory cache priority over corrupted localStorage", () => {
      // First, save valid entries
      const entries: SalaryEntry[] = [{ year: 2022, amountMan: 4000 }];
      entriesStore.save(entries);

      // Corrupt localStorage while keeping memory intact
      localStorage.setItem(STORAGE_KEY, "{corrupted");

      // load() should return memory cache (priority), not corrupted data
      const loadResult = entriesStore.load();
      expect(loadResult.ok).toBe(true);
      if (loadResult.ok) {
        expect(loadResult.entries).toHaveLength(1);
        expect(loadResult.entries[0]).toEqual({ year: 2022, amountMan: 4000 });
      }
    });

    it("should not output console.error on any failure path", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Load from corrupted data
      localStorage.setItem(STORAGE_KEY, "{bad");
      entriesStore.load();

      // Remove and fail on clear
      const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("failed");
      });
      entriesStore.clear();

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      removeItemSpy.mockRestore();
    });
  });
});
