// 통계청 KOSIS 소비자물가 연간 상승률 번들 (전년 대비 %)
// 출시 전 KOSIS 원자료 대조 필요 · 2025 값 확인 필요 · 조회일: (미기입)
import type { CpiData } from "@/lib/types";

export const cpi: CpiData = {
  source: "통계청 소비자물가지수 연간 상승률(KOSIS)",
  asOf: "2025년 연간",
  rates: [
    { year: 2021, ratePct: 2.5 },
    { year: 2022, ratePct: 5.1 },
    { year: 2023, ratePct: 3.6 },
    { year: 2024, ratePct: 2.3 },
    { year: 2025, ratePct: 2.1 },
  ],
};

const SLOT_COUNT = 5;

/** Home 연도 슬롯 — rates의 최신 5개 연도, 오름차순 */
export function getSlotYears(): number[] {
  return cpi.rates
    .map((r) => r.year)
    .sort((a, b) => a - b)
    .slice(-SLOT_COUNT);
}

/** 최신 확정 연도 — rates의 최댓값 */
export function getLatestCpiYear(): number {
  return Math.max(...cpi.rates.map((r) => r.year));
}
