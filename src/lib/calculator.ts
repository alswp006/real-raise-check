// 실질 인상률 계산기 — 순수 함수 모듈 (React·localStorage 의존 없음)
import type {
  AmountInputResult,
  AppResult,
  CpiData,
  PairRow,
  SalaryEntry,
} from "@/lib/types";

const MIN_AMOUNT_MAN = 1;
const MAX_AMOUNT_MAN = 100000;
const WON_PER_MAN = 10000;
/** CPI 확정치가 없는 연도에 쓰는 가정 물가 상승률 (2%) */
const ASSUMED_RATE = 1.02;

/** 부동소수 오차(4488.000000000001 등)를 1e-6 단위로 정리한 뒤 만원 단위로 올림 */
function ceilMan(valueMan: number): number {
  return Math.ceil(Math.round(valueMan * 1e6) / 1e6);
}

/** 전년 대비 CPI 상승률을 (from, to] 구간으로 연쇄 곱한 물가 계수 */
function cpiFactor(rateByYear: Map<number, number>, from: number, to: number): number {
  let factor = 1;
  for (let t = from + 1; t <= to; t += 1) {
    const rate = rateByYear.get(t);
    if (rate === undefined) {
      throw new Error(`${t}년 물가 상승률 데이터가 없어요`);
    }
    factor *= 1 + rate / 100;
  }
  return factor;
}

export function calculate(entries: SalaryEntry[], cpi: CpiData, currentYear: number): AppResult {
  if (entries.length < 2) {
    throw new Error("연봉을 2개 이상 입력해 주세요");
  }
  const sorted = [...entries].sort((a, b) => a.year - b.year);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].year === sorted[i - 1].year) {
      throw new Error(`${sorted[i].year}년 연봉이 중복돼요`);
    }
  }
  if (cpi.rates.length === 0) {
    throw new Error("물가 상승률 데이터가 없어요");
  }

  const rateByYear = new Map(cpi.rates.map((r) => [r.year, r.ratePct]));

  const rows: PairRow[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const from = sorted[i - 1];
    const to = sorted[i];
    const nominal = to.amountMan / from.amountMan - 1;
    const real = (1 + nominal) / cpiFactor(rateByYear, from.year, to.year) - 1;
    rows.push({
      fromYear: from.year,
      toYear: to.year,
      gapYears: to.year - from.year,
      fromMemo: from.memo,
      toMemo: to.memo,
      nominalPct: nominal * 100,
      realPct: real * 100,
    });
  }

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const cumulativeNominal = last.amountMan / first.amountMan - 1;
  const cumulativeReal =
    last.amountMan / (first.amountMan * cpiFactor(rateByYear, first.year, last.year)) - 1;

  const latestYear = Math.max(...cpi.rates.map((r) => r.year));
  const staleYears = Math.max(0, currentYear - latestYear);
  const stale = Math.pow(ASSUMED_RATE, staleYears);

  const keepMan = ceilMan(
    last.amountMan * cpiFactor(rateByYear, last.year, latestYear) * stale,
  );
  const restoreMan = ceilMan(
    first.amountMan * cpiFactor(rateByYear, first.year, latestYear) * stale,
  );
  const targetMan = Math.max(keepMan, restoreMan);

  return {
    rows,
    cumulativeRealPct: cumulativeReal * 100,
    cumulativeNominalPct: cumulativeNominal * 100,
    firstYear: first.year,
    lastYear: last.year,
    targetYear: currentYear,
    keepLineWon: keepMan * WON_PER_MAN,
    restoreLineWon: restoreMan * WON_PER_MAN,
    targetWon: targetMan * WON_PER_MAN,
    requiredRaisePct: (targetMan / last.amountMan - 1) * 100,
    staleYears,
  };
}

/** 연봉 입력 정제 — 숫자·콤마만 받는다. 빈 칸은 null, 앞자리 0은 제거 */
export function parseAmountInput(raw: string): AmountInputResult {
  if (!/^[0-9,]*$/.test(raw)) return { accept: false };
  const digits = raw.replace(/,/g, "");
  if (digits === "") return { accept: true, value: null };
  const value = Number(digits);
  if (!Number.isFinite(value)) return { accept: false };
  return { accept: true, value };
}

/** 연봉(만원) 정수 1~100000 */
export function validateAmount(amountMan: number): boolean {
  return (
    Number.isInteger(amountMan) && amountMan >= MIN_AMOUNT_MAN && amountMan <= MAX_AMOUNT_MAN
  );
}

/** 부호 붙은 % — 소수 1자리, 음수는 U+2212, 반올림 결과가 0이면 '+0.0%' */
export function formatSignedPct(pct: number): string {
  const tenths = Math.round(pct * 10);
  const abs = (Math.abs(tenths) / 10).toFixed(1);
  return `${tenths < 0 ? "−" : "+"}${abs}%`;
}
