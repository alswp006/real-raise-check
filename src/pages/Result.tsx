import { useEffect, useState } from "react";
import { Top, Paragraph, ListRow, Badge, Switch, Button, Spacing, Border } from "@toss/tds-mobile";
import { useNavigate } from "react-router-dom";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Card } from "@/components/Card";
import { Amount } from "@/components/Amount";
import { EmptyState } from "@/components/StateView";
import { AdSlot } from "@/components/AdSlot";
import { RaiseBars } from "@/components/RaiseBars";
import { ShareCardButton } from "@/components/ShareCardButton";
import { cpi, getLatestCpiYear } from "@/data/cpi";
import { calculate, formatSignedPct } from "@/lib/calculator";
import * as entriesStore from "@/lib/entriesStore";
import { formatNumber } from "@/lib/utils";
import { requestReviewOnce } from "@/lib/review";
import type { AppResult } from "@/lib/types";

type ViewState = { kind: "result"; r: AppResult } | { kind: "empty" } | { kind: "error" };

const MIN_ENTRIES = 2;

// 결과/Empty/에러 판정만 try/catch 대상이다. 광고는 이 바깥에 있다.
function compute(): ViewState {
  try {
    const loaded = entriesStore.load();
    if (!loaded.ok) {
      entriesStore.clear();
      return { kind: "error" };
    }
    if (loaded.entries.length < MIN_ENTRIES) return { kind: "empty" };
    return { kind: "result", r: calculate(loaded.entries, cpi, new Date().getFullYear()) };
  } catch {
    entriesStore.clear();
    return { kind: "error" };
  }
}

function tickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖에서는 SDK가 throw — 무시 */
  }
}

const won = (n: number) => `${formatNumber(n)}원`;

export default function Result() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>(() => compute());
  const [showAmount, setShowAmount] = useState(false);

  const done = view.kind === "result";
  useEffect(() => {
    if (done) requestReviewOnce();
  }, [done]);

  const goHome = () => navigate("/");
  const retry = () => {
    tickWeak();
    setView(compute());
  };
  const toggleAmount = (_e: unknown, checked: boolean) => {
    tickWeak();
    setShowAmount(checked);
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>진짜연봉체크</Top.TitleParagraph>} />}>
      {view.kind === "result" && (
        <ResultBody r={view.r} showAmount={showAmount} onToggleAmount={toggleAmount} onRestart={goHome} />
      )}

      {view.kind === "empty" && (
        <EmptyState
          title="입력한 연봉이 부족해요"
          description="2개 연도 이상 입력하면 실질 인상률을 보여드려요"
          action={
            <Button variant="weak" aria-label="연봉 입력하러 가기" onClick={goHome}>
              연봉 입력하러 가기
            </Button>
          }
        />
      )}

      {view.kind === "error" && (
        <>
          <Paragraph.Text typography="t4">결과를 불러오지 못했어요</Paragraph.Text>
          <Spacing size={16} />
          <Button variant="fill" size="large" display="block" aria-label="다시 시도" onClick={retry}>
            다시 시도
          </Button>
          <Spacing size={8} />
          <Button variant="weak" size="large" display="block" aria-label="입력 다시 하기" onClick={goHome}>
            입력 다시 하기
          </Button>
        </>
      )}

      <Spacing size={24} />
      {/* 분기 바깥 — 광고가 실패해도 위 결과 판정에는 영향이 없다 */}
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />
      <Spacing size={24} />
    </ScreenScaffold>
  );
}

function ResultBody({
  r,
  showAmount,
  onToggleAmount,
  onRestart,
}: {
  r: AppResult;
  showAmount: boolean;
  onToggleAmount: (e: unknown, checked: boolean) => void;
  onRestart: () => void;
}) {
  const decreased = r.cumulativeRealPct < 0;

  return (
    <>
      <SummaryHero
        testId="target-hero"
        label={`올해(${r.targetYear}) 목표 연봉`}
        value={<Amount value={r.targetWon} unit="원" typography="t1" />}
        caption={`작년 연봉 대비 ${formatSignedPct(r.requiredRaisePct)} 인상 필요`}
      />
      <Spacing size={8} />
      <ListRow
        contents={<ListRow.Texts type="1RowTypeA" top="작년 구매력 유지선" />}
        right={<Paragraph.Text typography="t5">{won(r.keepLineWon)}</Paragraph.Text>}
      />
      <ListRow
        contents={<ListRow.Texts type="1RowTypeA" top="첫 해 구매력 회복선" />}
        right={<Paragraph.Text typography="t5">{won(r.restoreLineWon)}</Paragraph.Text>}
      />
      <Spacing size={8} />
      <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
        올해 물가는 한국은행 물가안정목표 2%로 가정했어요 · 세전 기준 참고용
      </Paragraph.Text>
      {r.staleYears >= 2 && (
        <>
          <Spacing size={4} />
          <Paragraph.Text typography="t7" color="var(--adaptiveGrey700)">
            {`물가 데이터가 ${getLatestCpiYear()}년까지만 있어요`}
          </Paragraph.Text>
        </>
      )}

      <Spacing size={24} />
      <Border />
      <Spacing size={24} />

      <Card testId="cumulative-card">
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={`첫 해(${r.firstYear}) 대비 구매력 ${formatSignedPct(r.cumulativeRealPct)}`}
              bottom={<span>명목 <span>{formatSignedPct(r.cumulativeNominalPct)}</span></span>}
            />
          }
          right={
            <Badge size="small" variant="weak" color={decreased ? "red" : "blue"}>
              {decreased ? "구매력 감소" : "구매력 유지"}
            </Badge>
          }
        />
      </Card>

      <Spacing size={24} />
      <Paragraph.Text typography="t4">연도별 인상률</Paragraph.Text>
      <Spacing size={12} />
      <RaiseBars rows={r.rows} />
      <Spacing size={8} />
      <Paragraph.Text typography="st12" color="var(--adaptiveGrey600)">
        {`출처: ${cpi.source} · ${cpi.asOf} 기준`}
      </Paragraph.Text>

      <Spacing size={24} />
      <ListRow
        contents={<ListRow.Texts type="2RowTypeA" top="연봉 금액 표시" bottom="켜면 카드에 목표 연봉이 들어가요" />}
        right={<Switch checked={showAmount} onChange={onToggleAmount} aria-label="공유 카드에 연봉 금액 표시" />}
      />
      <Spacing size={8} />
      <ShareCardButton result={r} showAmount={showAmount} />
      <Spacing size={8} />
      <Button variant="weak" size="large" display="block" aria-label="다시 입력하기" onClick={onRestart}>
        다시 입력하기
      </Button>
    </>
  );
}
