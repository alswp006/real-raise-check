import { ListRow, Paragraph, Spacing } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { formatSignedPct } from "@/lib/calculator";
import type { PairRow } from "@/lib/types";

interface BarProps {
  testId: "bar-nominal" | "bar-real";
  value: number;
  max: number;
  color: string;
}

// 축 기준 반폭 안에서 |값| ÷ max × 100%. max가 0이면 0%(0으로 나누지 않는다).
function widthPct(value: number, max: number): string {
  if (max <= 0) return "0%";
  const pct = Math.round(((Math.abs(value) * 100) / max) * 10) / 10;
  return `${pct}%`;
}

function Bar({ testId, value, max, color }: BarProps) {
  const side = value < 0 ? "left" : "right";
  const bar = (
    <div
      data-testid={testId}
      data-side={side}
      style={{ width: widthPct(value, max), height: 8, background: color }}
    />
  );
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        {side === "left" ? bar : null}
      </div>
      <div style={{ width: 1, height: 12, background: adaptive.grey400 }} />
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
        {side === "right" ? bar : null}
      </div>
    </div>
  );
}

function yearLabel(row: PairRow): string {
  const from = row.fromMemo ? `${row.fromYear} · ${row.fromMemo}` : `${row.fromYear}`;
  const to = row.toMemo ? `${row.toYear} · ${row.toMemo}` : `${row.toYear}`;
  const gap = row.gapYears > 1 ? ` (${row.gapYears}년)` : "";
  return `${from}→${to}${gap}`;
}

export function RaiseBars({ rows }: { rows: PairRow[] }) {
  const max = rows.reduce(
    (m, r) => Math.max(m, Math.abs(r.nominalPct), Math.abs(r.realPct)),
    0,
  );

  return (
    <>
      {rows.map((row) => (
        <ListRow
          key={`${row.fromYear}-${row.toYear}`}
          contents={
            <div>
              <Paragraph.Text typography="t6">{yearLabel(row)}</Paragraph.Text>
              <Spacing size={8} />
              <Bar testId="bar-nominal" value={row.nominalPct} max={max} color={adaptive.grey400} />
              <Spacing size={4} />
              <Bar
                testId="bar-real"
                value={row.realPct}
                max={max}
                color={row.realPct < 0 ? adaptive.red500 : adaptive.blue500}
              />
              <Spacing size={4} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Paragraph.Text typography="st12" color="var(--adaptiveGrey600)">
                  {`명목 ${formatSignedPct(row.nominalPct)} · 실질 ${formatSignedPct(row.realPct)}`}
                </Paragraph.Text>
                {row.realPct < 0 ? (
                  <Paragraph.Text typography="st12" color={adaptive.red500}>
                    구매력 감소
                  </Paragraph.Text>
                ) : null}
              </div>
            </div>
          }
        />
      ))}
    </>
  );
}
