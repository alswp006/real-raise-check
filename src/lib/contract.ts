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
