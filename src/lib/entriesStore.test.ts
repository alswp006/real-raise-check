import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as store from "@/lib/entriesStore";

const KEY = "real-raise-check:v1:entries";

interface FakeStorage {
  data: Map<string, string>;
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
}

function makeFake(): FakeStorage {
  const data = new Map<string, string>();
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  };
}

let fake: FakeStorage;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fake = makeFake();
  vi.stubGlobal("localStorage", fake);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  store.__resetForTest();
});

afterEach(() => {
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

describe("entriesStore", () => {
  it("AC-1: 저장 후 메모리를 비워도 같은 항목을 읽는다", () => {
    const entries = [
      { year: 2022, amountMan: 4000, memo: "이직" },
      { year: 2023, amountMan: 4200 },
    ];
    expect(store.save(entries)).toEqual({ ok: true });
    expect(JSON.parse(fake.data.get(KEY)!)).toEqual(entries);
    store.__resetForTest();
    expect(store.load()).toEqual({ ok: true, entries });
  });

  it("AC-2: 잘못된 항목은 저장에서 빠지고 연도순으로 정렬된다", () => {
    const bad = [
      { year: 2023, amountMan: 4200 },
      { year: 2022, amountMan: 0 },
      { year: 2024, amountMan: 100001 },
      { year: 2025, amountMan: null },
      { year: 1900, amountMan: 5000 },
      { year: 2021, amountMan: 3800, memo: "" },
    ] as never;
    store.save(bad);
    expect(JSON.parse(fake.data.get(KEY)!)).toEqual([
      { year: 2021, amountMan: 3800 },
      { year: 2023, amountMan: 4200 },
    ]);
  });

  it.each(["{bad", '[{"year":"x"}]', JSON.stringify([{ year: 2022, amountMan: 4000, memo: "12345678901" }])])(
    "AC-3: 깨진 저장값 %s는 {ok:false}이고 키가 지워진다",
    (raw) => {
      fake.data.set(KEY, raw);
      expect(store.load()).toEqual({ ok: false });
      expect(fake.data.has(KEY)).toBe(false);
    },
  );

  it("AC-4: setItem이 QuotaExceededError를 던져도 {ok:false}이고 메모리는 유지된다", () => {
    fake.setItem.mockImplementation(() => {
      const err = new Error("quota");
      err.name = "QuotaExceededError";
      throw err;
    });
    const entries = [{ year: 2022, amountMan: 4000 }];
    expect(store.save(entries)).toEqual({ ok: false });
    expect(store.load()).toEqual({ ok: true, entries });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-5: removeItem이 던지면 clear()는 {ok:false}, load()는 빈 배열", () => {
    store.save([{ year: 2022, amountMan: 4000 }]);
    fake.removeItem.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(store.clear()).toEqual({ ok: false });
    expect(store.load()).toEqual({ ok: true, entries: [] });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-6: 저장 키가 없으면 빈 배열", () => {
    expect(store.load()).toEqual({ ok: true, entries: [] });
  });

  it("메모리 사본이 깨진 localStorage보다 우선한다", () => {
    store.save([{ year: 2022, amountMan: 4000 }]);
    fake.data.set(KEY, "{corrupted");
    expect(store.load()).toEqual({ ok: true, entries: [{ year: 2022, amountMan: 4000 }] });
  });
});
