import { useRef, useState } from "react";
import { Button, useToast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { cpi } from "@/data/cpi";
import { logClick } from "@/lib/analytics";
import { renderShareCard, saveShareImage } from "@/lib/shareCard";
import type { AppResult } from "@/lib/types";

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖에서는 SDK가 throw — 무시 */
  }
}

export function ShareCardButton({ result, showAmount }: { result: AppResult; showAmount: boolean }) {
  const { openToast } = useToast();
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);

  const handleClick = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    fireHaptic();
    logClick("share_card_save");
    try {
      const blob = await renderShareCard(result, { showAmount, cpi });
      const outcome = await saveShareImage(blob);
      if (outcome !== "aborted") openToast("이미지를 저장했어요. 입력한 연봉은 기기에 남아 있어요");
    } catch {
      openToast("저장하지 못했어요. 다시 시도해 주세요");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  return (
    <Button
      variant="fill"
      size="large"
      display="block"
      aria-label="공유 카드 저장"
      loading={loading}
      disabled={loading}
      onClick={handleClick}
    >
      공유 카드 저장
    </Button>
  );
}
