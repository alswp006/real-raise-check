import { cpi } from "@/data/cpi";
import { validateAmount } from "@/lib/calculator";
import type { LoadResult, SalaryEntry, SaveResult } from "@/lib/types";

const STORAGE_KEY = "real-raise-check:v1:entries";
const MAX_MEMO_LENGTH = 10;

// 메모리 사본 — null이면 아직 localStorage를 읽지 않은 상태
let memory: SalaryEntry[] | null = null;

function isKnownYear(year: unknown): year is number {
  return typeof year === "number" && cpi.rates.some((r) => r.year === year);
}

/** 저장·로드 공용 검사. 스키마에 맞으면 정규화한 항목, 아니면 null */
function normalize(raw: unknown): SalaryEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { year, amountMan, memo } = raw as Record<string, unknown>;
  if (!isKnownYear(year)) return null;
  if (typeof amountMan !== "number" || !validateAmount(amountMan)) return null;
  if (memo === undefined || memo === null || memo === "") {
    return { year, amountMan };
  }
  if (typeof memo !== "string" || memo.length > MAX_MEMO_LENGTH) return null;
  return { year, amountMan, memo };
}

function copy(entries: SalaryEntry[]): SalaryEntry[] {
  return entries.map((e) => ({ ...e }));
}

function safeRemove(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function load(): LoadResult {
  if (memory) return { ok: true, entries: copy(memory) };

  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    memory = [];
    return { ok: true, entries: [] };
  }
  if (raw === null) {
    memory = [];
    return { ok: true, entries: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    safeRemove();
    return { ok: false };
  }

  if (!Array.isArray(parsed)) {
    safeRemove();
    return { ok: false };
  }
  const entries: SalaryEntry[] = [];
  for (const item of parsed) {
    const entry = normalize(item);
    if (!entry) {
      safeRemove();
      return { ok: false };
    }
    entries.push(entry);
  }

  memory = entries;
  return { ok: true, entries: copy(entries) };
}

export function save(entries: SalaryEntry[]): SaveResult {
  const valid: SalaryEntry[] = [];
  for (const item of entries) {
    const entry = normalize(item);
    if (entry) valid.push(entry);
  }
  valid.sort((a, b) => a.year - b.year);

  memory = valid;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export function clear(): SaveResult {
  memory = [];
  return { ok: safeRemove() };
}

export function __resetForTest(): void {
  memory = null;
}
