import type { AppResult, CpiData } from "@/lib/types";
import { formatSignedPct } from "@/lib/calculator";
import { formatNumber } from "@/lib/utils";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const PADDING_X = 80;
const MAX_ROWS = 4;
const APP_NAME = "진짜연봉체크";
const FILE_NAME = "real-raise-check.png";
const FONT_FAMILY = "-apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

/** 토큰 CSS 변수 → 색 문자열. 빈 값이면 undefined — 그러면 fillStyle을 건드리지 않는다(캔버스 기본값). */
function readToken(name: string): string | undefined {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value === "" ? undefined : value;
  } catch {
    return undefined;
  }
}

function setFill(ctx: CanvasRenderingContext2D, color: string | undefined) {
  if (color !== undefined) ctx.fillStyle = color;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("이미지를 만들지 못했어요"));
    }, "image/png");
  });
}

export async function renderShareCard(
  result: AppResult,
  opts: { showAmount: boolean; cpi: CpiData },
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 쓸 수 없어요");

  const background = readToken("--adaptiveBackground");
  const textStrong = readToken("--adaptiveGrey900");
  const textMuted = readToken("--adaptiveGrey600");
  const accent = readToken("--adaptiveBlue500");
  const danger = readToken("--adaptiveRed500");
  const panel = readToken("--adaptiveGrey100");

  // 배경 — 토큰이 비면 캔버스 기본값(투명)이라 흰 칠은 하지 않는다.
  if (background !== undefined) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  }

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    weight: "400" | "700",
    color: string | undefined,
    align: CanvasTextAlign = "left",
  ) => {
    ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
    ctx.textAlign = align;
    setFill(ctx, color);
    ctx.fillText(value, x, y);
  };

  // 앱 이름
  text(APP_NAME, PADDING_X, 140, 44, "700", accent);

  // 누적 구매력 변화율 — 히어로 숫자
  text(`${result.firstYear}년부터 ${result.lastYear}년까지`, PADDING_X, 260, 40, "400", textMuted);
  text("누적 구매력 변화율", PADDING_X, 320, 48, "700", textStrong);
  text(
    formatSignedPct(result.cumulativeRealPct),
    PADDING_X,
    500,
    168,
    "700",
    result.cumulativeRealPct < 0 ? danger : accent,
  );

  // 필요 인상률 패널
  const panelY = 580;
  const panelH = showAmountPanelHeight(opts.showAmount);
  if (panel !== undefined) {
    ctx.fillStyle = panel;
    ctx.fillRect(PADDING_X, panelY, CARD_WIDTH - PADDING_X * 2, panelH);
  }
  text("물가를 따라잡으려면 필요한 인상률", PADDING_X + 40, panelY + 80, 36, "400", textMuted);
  text(formatSignedPct(result.requiredRaisePct), PADDING_X + 40, panelY + 170, 88, "700", textStrong);
  if (opts.showAmount) {
    text(`${result.targetYear}년 목표 연봉`, PADDING_X + 40, panelY + 240, 32, "400", textMuted);
    text(`${formatNumber(result.targetWon)}원`, PADDING_X + 40, panelY + 296, 56, "700", textStrong);
  }

  // 최근 실질 인상률 (최대 4행)
  const listY = panelY + panelH + 90;
  text("최근 실질 인상률", PADDING_X, listY, 36, "700", textStrong);
  const recent = result.rows.slice(-MAX_ROWS);
  recent.forEach((row, i) => {
    const y = listY + 80 + i * 76;
    text(`${row.fromYear}년 → ${row.toYear}년`, PADDING_X, y, 36, "400", textMuted);
    text(
      formatSignedPct(row.realPct),
      CARD_WIDTH - PADDING_X,
      y,
      40,
      "700",
      row.realPct < 0 ? danger : textStrong,
      "right",
    );
  });

  // 출처
  text(
    `출처: ${opts.cpi.source} · ${opts.cpi.asOf} 기준`,
    PADDING_X,
    CARD_HEIGHT - 80,
    28,
    "400",
    textMuted,
  );

  return canvasToBlob(canvas);
}

function showAmountPanelHeight(showAmount: boolean): number {
  return showAmount ? 340 : 230;
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

function download(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILE_NAME;
  a.click();
  URL.revokeObjectURL(url);
}

/** share → download 순서로 저장한다. 사용자가 공유를 취소하면 'aborted', 그 밖의 예외는 던진다. */
export async function saveShareImage(blob: Blob): Promise<"shared" | "downloaded" | "aborted"> {
  const file = new File([blob], FILE_NAME, { type: "image/png" });
  const canShareFile =
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFile) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (error) {
      if (isAbortError(error)) return "aborted";
      throw error;
    }
  }

  download(blob);
  return "downloaded";
}
