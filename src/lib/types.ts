// Domain types — SPEC Data Model

export interface SalaryEntry {
  year: number; // CPI 데이터에 있는 연도만
  amountMan: number; // 세전 연봉, 만원 단위 정수 (1~100000)
  memo?: string; // 최대 10자, 예: "이직"
}

export interface CpiData {
  source: string; // "통계청 소비자물가지수 연간 상승률(KOSIS)"
  asOf: string; // 데이터 수록 기준, 예: "2025년 연간"
  rates: { year: number; ratePct: number }[]; // 전년 대비 %
}

export interface PairRow {
  fromYear: number;
  toYear: number;
  gapYears: number;
  fromMemo?: string;
  toMemo?: string;
  nominalPct: number;
  realPct: number;
}

export interface AppResult {
  rows: PairRow[];
  cumulativeRealPct: number;
  cumulativeNominalPct: number;
  firstYear: number;
  lastYear: number;
  targetYear: number; // Y
  keepLineWon: number; // A
  restoreLineWon: number; // B
  targetWon: number; // max(A,B), 만원 단위 올림
  requiredRaisePct: number; // Z
  staleYears: number; // n
}

// 연봉 입력 정제 결과
export type AmountInputResult =
  | { accept: false } // 숫자·콤마 외 문자 포함 → 직전 값 유지
  | { accept: true; value: number | null }; // null = 빈 칸(개별 삭제)

// 저장 결과
export interface SaveResult {
  ok: boolean;
}

// entriesStore.load() 결과
export type LoadResult = { ok: true; entries: SalaryEntry[] } | { ok: false };
