import { useRef, useState } from "react";
import type { FocusEvent } from "react";
import { Top, Paragraph, Spacing, TextField, Button, AlertDialog, useToast } from "@toss/tds-mobile";
import { useNavigate } from "react-router-dom";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { getSlotYears } from "@/data/cpi";
import { parseAmountInput, validateAmount } from "@/lib/calculator";
import * as entriesStore from "@/lib/entriesStore";
import { formatNumber } from "@/lib/utils";
import { logClick } from "@/lib/analytics";
import type { SalaryEntry } from "@/lib/types";

// 화면 상태는 슬롯별 {금액, 메모, touched}. 무효 금액은 화면에만 남고 저장되지 않는다.
interface Slot {
  amount: number | null;
  memo: string;
  touched: boolean;
}
type Slots = Record<number, Slot>;

const MIN_YEARS = 2;
const MAX_MEMO_LENGTH = 10;
// 7자리를 넘는 숫자는 범위 밖이 분명하다 — 정밀도 손실 전에 입력 단계에서 막는다.
const MAX_AMOUNT_DIGITS = 7;
const RANGE_HELP = "1만원 ~ 100,000만원 사이로 입력해 주세요";
const SAVE_FAIL_TOAST = "저장하지 못했어요. 앱을 닫으면 입력이 사라질 수 있어요";
const CLEAR_FAIL_TOAST = "지우지 못했어요. 다시 시도해 주세요";

function haptic(type: "tickWeak" | "tickMedium") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

function scrollToCenter(e: FocusEvent<HTMLInputElement>) {
  try {
    e.currentTarget.scrollIntoView({ block: "center" });
  } catch {
    /* 구형 WebView 대비 */
  }
}

function emptySlots(years: number[]): Slots {
  const slots: Slots = {};
  for (const y of years) slots[y] = { amount: null, memo: "", touched: false };
  return slots;
}

function initialSlots(years: number[]): Slots {
  const slots = emptySlots(years);
  const loaded = entriesStore.load();
  if (!loaded.ok) return slots;
  for (const e of loaded.entries) {
    if (slots[e.year]) slots[e.year] = { amount: e.amountMan, memo: e.memo ?? "", touched: false };
  }
  return slots;
}

function toEntries(years: number[], slots: Slots): SalaryEntry[] {
  const entries: SalaryEntry[] = [];
  for (const year of years) {
    const { amount, memo } = slots[year];
    if (amount === null || !validateAmount(amount)) continue;
    entries.push(memo ? { year, amountMan: amount, memo } : { year, amountMan: amount });
  }
  return entries;
}

const isInvalid = (s: Slot) => s.amount !== null && !validateAmount(s.amount);

export default function Home() {
  const navigate = useNavigate();
  const { openToast } = useToast();
  const [years] = useState(getSlotYears);
  const [slots, setSlots] = useState<Slots>(() => initialSlots(years));
  const [hasSaved] = useState(() => toEntries(years, slots).length > 0);
  const [clearOpen, setClearOpen] = useState(false);
  const lastSaveOkRef = useRef(true);

  const filledCount = toEntries(years, slots).length;
  const hasInvalid = years.some((y) => isInvalid(slots[y]));
  const hasAnyInput = years.some((y) => slots[y].amount !== null || slots[y].memo !== "");
  const canCalc = filledCount >= MIN_YEARS && !hasInvalid;

  // 바뀐 슬롯을 반영하고 곧바로 저장한다. 실패 Toast는 성공→실패로 넘어갈 때만 1회.
  const commit = (next: Slots) => {
    setSlots(next);
    const { ok } = entriesStore.save(toEntries(years, next));
    if (!ok && lastSaveOkRef.current) openToast(SAVE_FAIL_TOAST);
    lastSaveOkRef.current = ok;
  };

  const onAmountChange = (year: number, raw: string) => {
    const parsed = parseAmountInput(raw);
    if (!parsed.accept) return;
    if (parsed.value !== null && String(parsed.value).length > MAX_AMOUNT_DIGITS) return;
    commit({ ...slots, [year]: { ...slots[year], amount: parsed.value } });
  };

  const onMemoChange = (year: number, memo: string) => {
    if (memo.length > MAX_MEMO_LENGTH) return;
    commit({ ...slots, [year]: { ...slots[year], memo } });
  };

  const markTouched = (year: number) => {
    if (slots[year].touched) return;
    setSlots((prev) => ({ ...prev, [year]: { ...prev[year], touched: true } }));
  };

  const openClearDialog = () => {
    haptic("tickWeak");
    setClearOpen(true);
  };
  const closeClearDialog = () => setClearOpen(false);
  const confirmClear = () => {
    haptic("tickMedium");
    setClearOpen(false);
    setSlots(emptySlots(years));
    lastSaveOkRef.current = true;
    if (!entriesStore.clear().ok) openToast(CLEAR_FAIL_TOAST);
  };

  const goResult = () => {
    logClick("calculate_submit", { years: filledCount });
    navigate("/result");
  };

  const hint =
    filledCount < MIN_YEARS
      ? "연봉을 2개 연도 이상 입력해 주세요"
      : hasInvalid
        ? "빨간 칸의 금액을 고쳐 주세요"
        : undefined;

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>진짜연봉체크</Top.TitleParagraph>}
          right={
            <Button
              variant="weak"
              size="medium"
              color="dark"
              aria-label="전체 지우기"
              disabled={!hasAnyInput}
              onClick={openClearDialog}
            >
              전체 지우기
            </Button>
          }
        />
      }
      bottom={<SubmitFooter label="결과 계산하기" onClick={goResult} disabled={!canCalc} hint={hint} />}
    >
      {!hasSaved && (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
            최근 연봉을 입력하면 물가를 뺀 진짜 인상률을 알려드려요
          </Paragraph.Text>
        </>
      )}
      <Spacing size={16} />
      {years.map((year, idx) => {
        const slot = slots[year];
        const showError = slot.touched && isInvalid(slot);
        const isLast = idx === years.length - 1;
        return (
          <div key={year}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 8, alignItems: "start", margin: "0 -16px" }}>
                <TextField
                  variant="box"
                  labelOption="sustain"
                  label={`${year}년 연봉`}
                  suffix="만원"
                  aria-label={`${year}년 세전 연봉(만원)`}
                  inputMode="numeric"
                  enterKeyHint="next"
                  placeholder="4,200"
                  value={slot.amount === null ? "" : formatNumber(slot.amount)}
                  onChange={(e) => onAmountChange(year, e.target.value)}
                  onFocus={scrollToCenter}
                  onBlur={() => markTouched(year)}
                  hasError={showError}
                  help={showError ? RANGE_HELP : undefined}
                />
                <TextField
                  variant="box"
                  labelOption="sustain"
                  label="메모"
                  aria-label={`${year}년 메모`}
                  enterKeyHint={isLast ? "done" : "next"}
                  placeholder="이직"
                  value={slot.memo}
                  onChange={(e) => onMemoChange(year, e.target.value)}
                  onFocus={scrollToCenter}
                />
            </div>
            <Spacing size={12} />
          </div>
        );
      })}
      <Spacing size={160} />
      <AlertDialog
        open={clearOpen}
        title="입력한 연봉을 모두 지울까요?"
        onClose={closeClearDialog}
        alertButton={
          <>
            <AlertDialog.AlertButton onClick={closeClearDialog}>닫기</AlertDialog.AlertButton>
            <AlertDialog.AlertButton onClick={confirmClear}>지우기</AlertDialog.AlertButton>
          </>
        }
      />
    </ScreenScaffold>
  );
}
