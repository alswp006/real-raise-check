# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** (구현: 패킷 0001) */
export type SalaryEntry = { year: number; amountMan: number; memo?: string };

/** (구현: 패킷 0001) */
export type CpiData = { [year: number]: number };

/** (구현: 패킷 0001) */
export type PairRow = { year: number; memo?: string; nominalPct: number; realPct: number };

/** (구현: 패킷 0001) */
export type AppResult = { entries: SalaryEntry[]; rows: PairRow[]; targetAmountMan: number; cumulativeRealPct: number };

/** (구현: 패킷 0001) */
export type AmountInputResult = { ok: boolean; value?: number };

/** (구현: 패킷 0001) */
export type SaveResult = { ok: boolean; error?: string };

/** (구현: 패킷 0001) */
export type LoadResult = { ok: boolean; entries?: SalaryEntry[]; error?: string };

/** (구현: 패킷 0001) */
export type getSlotYearsFn = () => number[];

/** (구현: 패킷 0001) */
export type getLatestCpiYearFn = () => number;

/** (구현: 패킷 0002) */
export type calculateFn = (entries: SalaryEntry[], cpi: CpiData, currentYear: number) => AppResult;

/** (구현: 패킷 0002) */
export type parseAmountInputFn = (input: string) => AmountInputResult;

/** (구현: 패킷 0002) */
export type validateAmountFn = (amount: number) => boolean;

/** (구현: 패킷 0002) */
export type formatSignedPctFn = (pct: number) => string;

/** entriesStore.load() (구현: 패킷 0003) */
export type loadFn = () => LoadResult;

/** entriesStore.save() (구현: 패킷 0003) */
export type saveFn = (entries: SalaryEntry[]) => SaveResult;

/** entriesStore.clear() (구현: 패킷 0003) */
export type clearFn = () => SaveResult;

/** (구현: 패킷 0006) */
export type renderShareCardFn = (result: AppResult) => Blob;

/** (구현: 패킷 0006) */
export type saveShareImageFn = (blob: Blob) => Promise<SaveResult>;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
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

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    RaiseBars.tsx
    ScreenScaffold.tsx
    ShareCardButton.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  data/
    cpi.ts
  hooks/
  lib/
    analytics.ts
    calculator.test.ts
    calculator.ts
    contract.ts
    entriesStore.test.ts
    entriesStore.ts
    review.ts
    share.ts
    shareCard.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    Result.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- analytics.ts: export type LogFields = Record<string, string | number | boolean | null>; export const DWELL_MS = 3000; export function fireAndForget(call: () => unknown): void; export function logScreen(page: string, extra?: LogFields): void; export function logClick(name: string, extra?: LogFields): void; export function logImpression(name: string, extra?: LogFields): void; export function useScreenLog(page: string): void
- calculator.ts: export function calculate(entries: SalaryEntry[], cpi: CpiData, currentYear: number): AppResult; export function parseAmountInput(raw: string): AmountInputResult; export function validateAmount(amountMan: number): boolean; export function formatSignedPct(pct: number): string
- contract.ts: export type SalaryEntry =; export type CpiData =; export type PairRow =; export type AppResult =; export type AmountInputResult =; export type SaveResult =; export type LoadResult =; export type getSlotYearsFn = () => number[]
- entriesStore.ts: export function load(): LoadResult; export function save(entries: SalaryEntry[]): SaveResult; export function clear(): SaveResult; export function __resetForTest(): void
- review.ts: export function requestReviewOnce(key: string = REVIEW_REQUESTED_KEY): void
- share.ts: export interface ShareAppOptions; export async function shareApp(opts: ShareAppOptions): Promise<void>
- shareCard.ts: export async function renderShareCard( result: AppResult, opts:; export async function saveShareImage(blob: Blob): Promise<"shared" | "downloaded" | "aborted">
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export interface SalaryEntry; export interface CpiData; export interface PairRow; export interface AppResult; export type AmountInputResult = |; export interface SaveResult; export type LoadResult =
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- RaiseBars.tsx: RaiseBars
- ScreenScaffold.tsx: ScreenScaffold
- ShareCardButton.tsx: ShareCardButton
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/calculator.ts → imports: lib/types
  lib/entriesStore.ts → imports: data/cpi, lib/calculator, lib/types
  lib/shareCard.ts → imports: lib/types, lib/calculator, lib/utils
  pages/Home.tsx → imports: components/ScreenScaffold, components/BottomCTA, data/cpi, lib/calculator, lib/entriesStore, lib/utils, lib/analytics, lib/types
  pages/Result.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Card, components/Amount, components/StateView, components/AdSlot, components/RaiseBars, components/ShareCardButton, data/cpi, lib/calculator, lib/entriesStore, lib/utils, lib/review, lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: Types & Constants (types + CPI 번들) (files: src/lib/types.ts, src/data/cpi.ts)
- 0002: Core Logic (계산기 순수 함수 + 테스트) (files: src/lib/calculator.ts, src/lib/calculator.test.ts, package.json)
- 0003: entriesStore (localStorage + 메모리 사본) (files: src/lib/entriesStore.ts, src/lib/entriesStore.test.ts)
- 0005: RaiseBars 컴포넌트 (명목 vs 실질 막대) (files: src/components/RaiseBars.tsx)
- 0006: 공유 카드 (Canvas PNG + ShareCardButton) (files: src/lib/shareCard.ts, src/components/ShareCardButton.tsx)
- 0007: Result Page (목표 연봉 + 비교 + 배너) (files: src/pages/Result.tsx)
- 0008: Routing & Integration (App 라우트 + 검수 점검) (files: src/App.tsx)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({

// src/components/RaiseBars.tsx
export function RaiseBars({ rows }: { rows: PairRow[] }) {

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/ShareCardButton.tsx
export function ShareCardButton({ result, showAmount }: { result: AppResult; showAmount: boolean }) {

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/data/cpi.ts
export const cpi: CpiData = {
export function getSlotYears(): number[] {
export function getLatestCpiYear(): number {

// src/lib/analytics.ts
export type LogFields = Record<string, string | number | boolean | null>;
export const DWELL_MS = 3000;
export function fireAndForget(call: () => unknown): void {
export function logScreen(page: string, extra?: LogFields): void {
export function logClick(name: string, extra?: LogFields): void {
export function logImpression(name: string, extra?: LogFields): void {
export function useScreenLog(page: string): void {

// src/lib/calculator.ts
export function calculate(entries: Sal

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(4), general(14), testing(2), ui(3)

Key lessons (verify against actual code before applying):
- [general] 진입점 라우터 배선은 맨 끝에 두지 말고 기반 패킷 직후 플레이스홀더 페이지와 함께 먼저 병합하라. 화면 패킷은 그 플레이스홀더를 교체하게 해서, 언제 중단돼도 병합된 화면에 도달할 수 있게 하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 파일 생성 전 디렉토리 구조 확인 — mkdir -p로 경로 보장 (60% · 타 앱 1회 — 맹신 금지)
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)