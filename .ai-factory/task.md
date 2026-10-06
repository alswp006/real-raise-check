# Real Raise Check — QuickSpec 보완본

## 이번 보완 요약

**추가한 AC는 3개입니다.** 기존 AC 30개는 그대로 두었고, 합계는 33개가 되었습니다.

| 새 AC | 막는 문제 | 반영한 Task |
|---|---|---|
| AC-INPUT-3 | 연봉 칸에 소수점이나 특수문자가 들어가는 경우 | Task 2, Task 4 |
| AC-STORAGE-1 | localStorage 쓰기가 실패하면 결과 화면이 Empty로 빠지고 사용자는 이유를 모르는 경우 | Task 3, Task 4 |
| AC-AD-1 | 배너 광고가 실패해도 결과 화면이 깨지지 않아야 하는 경우 | Task 6 |

**반영하지 않은 제안과 이유**
- **광고 5초 타임아웃, 100px 플레이스홀더**: 근거가 있는 수치가 아닙니다. AdSlot은 템플릿이 제공하는 컴포넌트라 이번 설계 범위에서 다시 만들지 않습니다.
- **"4200.5"는 내림, "4$00"은 400으로 숫자만 뽑는 규칙**: 숫자만 뽑으면 "4200.5"가 42005가 되어 금액이 10배로 바뀝니다. 그래서 숫자가 아닌 문자는 아예 입력되지 않게 했고, 소수점을 어떻게 처리할지 정할 필요가 없어졌습니다.
- **공유 5초 타임아웃**: `navigator.share`는 사용자가 공유 대상을 고를 때까지 기다리는 것이 정상 동작입니다. 시간 제한을 걸면 정상적인 공유도 실패로 처리됩니다. 공유 중 예외는 기존 F3-AC-4가 이미 처리합니다.
- **AdSlot을 에러 바운더리로 감싸는 방식**: React는 바운더리가 잡은 에러도 console.error로 남길 수 있습니다. 그러면 AC-REVIEW-2(console.error 0개)와 부딪히므로 구현 방법으로 지정하지 않았습니다. 대신 통과 조건만 AC로 적었습니다.
- **원본 끝의 Canva 커넥터 안내 문단**: 스펙 내용이 아니라서 본문에서 뺐습니다.
- **'앱이 더하는 것' 문단**: 요청하신 대로 수정하지 않았습니다.

새로 추가하거나 바꾼 곳에는 아래 본문에서 **(추가)** 표시를 달았습니다.

---

# Real Raise Check (real-raise-check)
앱 이름: 진짜연봉체크 / Real Raise Check

## Mini-PRD
- **한줄 요약**: 최근 5년 세전 연봉을 넣으면 통계청 물가로 보정한 연도별 실질 인상률과 누적 구매력 변화를 보여 줍니다. 물가를 따라잡으려면 올해 얼마를 요구해야 하는지 금액으로 알려 줍니다.
- **문제**: 연봉 협상이나 이직 때 사람들은 명목 인상률만 보고 판단합니다. 하지만 물가 상승분을 빼면 구매력은 오히려 줄었을 수 있습니다. 지금은 계산기나 엑셀로 직접 계산해야 하고, 협상 근거로 쓸 만큼 정리된 숫자를 가진 사람은 드뭅니다.
- **목표**: 연봉을 2개 연도 이상 입력한 사용자가 화면 하나에서 "올해 목표 연봉(원)"과 "직전 연봉 대비 필요 인상률(%)"을 바로 확인합니다.
- **타겟 유저**: 20~30대 직장인 중 연봉 협상이나 이직을 앞두고, 인상률이 실제 구매력 상승인지 궁금한 사람
- **핵심 기능** (최대 3개):
  1. 최근 5개 연도(물가 확정 연도 기준) 세전 연봉 입력. 연도별 메모를 달 수 있고 localStorage에 저장하며 수정·삭제할 수 있습니다.
  2. 통계청 소비자물가 상승률을 번들 데이터로 넣어 연도별 명목 vs 실질 인상률을 비교 막대로 보여 주고, 첫 해 대비 누적 구매력 변화율을 계산합니다.
  3. 물가를 따라잡기 위한 올해 목표 연봉과 필요 인상률을 계산하고, 공유 카드 이미지로 저장합니다.
- **비목표**:
  - 세후 실수령액, 4대보험, 성과급·퇴직금 계산
  - 업종·직군별 연봉 비교, 적정 연봉 추천
  - 투자·재테크 조언
- **수익 모델**: 배너 (Result 하단 AdSlot 1개). 리워드 게이트 없음. 결과 화면에 따로 잠글 만한 더 깊은 층이 없습니다.
  - 예상 월 순수익 = DAU 15 × 2회 × 30 × (2,648 ÷ 1000) × 0.85 ≈ **2,026원/월** (출시 직후 기저선 DAU 15 기준. 외부 유입 근거가 없어 상향하지 않았습니다.)

## Value Contract
- 결과: 이 앱을 쓰고 나면 사용자는 올해 연봉 협상에서 요구할 최소 목표 연봉 금액과 필요 인상률을 정한다.
- 바뀌는 행동: 회사가 제시한 명목 인상률을 그대로 받아들이지 않고, 앱이 계산한 목표 연봉(필요 인상률) 이상을 금액으로 제시한다.
- 매번 얻는 결과물: 올해 목표 연봉 금액(원), 직전 연봉 대비 필요 인상률(%), 그리고 그 근거인 작년 구매력 유지선·첫 해 구매력 회복선 두 줄. 연도별 명목/실질 인상률 막대와 누적 구매력 변화율도 함께 나온다.
- 앱이 더하는 것: 통계청 소비자물가지수 연간 상승률(KOSIS)을 번들로 넣고, 연도 사이를 연쇄 보정해 계산한다(빈 연도가 있어도 누적). 올해 물가는 한국은행 물가안정목표 2%로 가정한다. 사용자가 직접 찾지 않는 물가 값과 연쇄 계산 규칙이 들어 있다.
- 앱 없이: KOSIS에서 연도별 물가상승률을 찾아 엑셀에 옮기고 연쇄 곱으로 계산하는 데 약 10~15분 걸린다.
- Value AC: F3-AC-1

## SPEC

### F1: 연도별 세전 연봉 입력·저장
- AC-1: [U] Home은 번들 CPI 데이터의 최근 확정 5개 연도(데이터가 2025까지면 2021~2025)를 오름차순 슬롯으로 보여 준다. 슬롯마다 ListRow 안에 연봉 TextField(단위 "만원", `inputMode="numeric"`)와 메모 TextField(선택, 최대 10자, placeholder "예: 이직")가 있다. 메모가 11자 이상이면 입력되지 않는다.
- AC-2: [E] When 연봉이나 메모 입력값이 바뀌면, 시스템은 localStorage 키 `real-raise-check:v1:entries`에 `SalaryEntry[]`를 저장한다. 앱을 닫았다 다시 열면 같은 연도에 같은 금액·메모가 복원된다.
- AC-3: [U] 연봉 TextField는 입력 중 천 단위 콤마를 표시한다(4200 → "4,200"). 저장값은 콤마 없는 정수(만원)다.
- AC-4: [E] When 사용자가 "전체 지우기"를 누르면, 시스템은 AlertDialog("입력한 연봉을 모두 지울까요?")를 띄운다. "지우기"를 누르면 모든 슬롯이 비고 localStorage 키가 삭제된다. "취소"를 누르면 아무것도 바뀌지 않는다.
- AC-5: [E] When 특정 연도 연봉 칸을 비우면, 그 연도는 저장 목록에서 빠지고 Result 계산에서도 제외된다(개별 삭제).

### F2: 명목 vs 실질 인상률 비교 + 누적 구매력
- AC-1: [E] When Result에 진입하면, 시스템은 연봉이 입력된 연도를 오름차순으로 정렬한다. 이웃한 두 입력 연도(a→b)마다 한 행씩 만들고 명목·실질 인상률을 소수점 1자리 %로 표시한다.
  - 명목 = S_b ÷ S_a − 1
  - 실질 = (1 + 명목) ÷ Π_{t=a+1..b}(1 + r_t) − 1
  - 검증 예시(픽스처 r_2023 = 3.6%): 2022년 4,000만원 → 2023년 4,200만원이면 명목 "+5.0%", 실질 "+1.4%"
- AC-2: [U] 각 행은 0 기준축을 가운데 둔 막대 2개(명목, 실질)를 보여 준다.
  - 양수는 오른쪽, 음수는 왼쪽으로 뻗는다.
  - 막대 길이 = |값| ÷ (모든 행 중 |값|의 최댓값) × 반폭 100%
  - 실질이 음수면 실질 막대 색은 `vars.color.red500`이고 행에 "구매력 감소" 텍스트가 보인다. 0 이상이면 `vars.color.blue500`이다.
- AC-3: [U] 누적 카드는 "첫 해({첫 연도}) 대비 구매력 {±X.X}%"와 "명목 {±Y.Y}%"를 표시한다.
  - 누적 실질 = S_last ÷ (S_first × Π_{first+1..last}(1 + r_t)) − 1
  - 검증 예시(픽스처 r: 2022 5.1%, 2023 3.6%, 2024 2.3%, 2025 2.1%): 2021년 4,000만원, 2025년 4,400만원이면 구매력 "−3.3%", 명목 "+10.0%"
- AC-4: [U] 메모가 있는 연도는 해당 행의 연도 라벨 옆에 메모 텍스트가 그대로 보인다(예: "2024 · 이직"). 입력한 모든 연도는 행의 시작이나 끝 연도로 화면에 최소 1번 나온다.
- AC-5: [U] 비교 영역 아래에 "출처: 통계청 소비자물가지수 연간 상승률(KOSIS) · {asOf} 기준" 한 줄이 보인다.
- AC-6: [W] If 이웃한 두 입력 연도가 연속이 아니면(예: 2021→2023), 행 라벨은 "2021→2023 (2년)"으로 표시하고 실질 계산에는 그 사이 연도들의 r_t를 모두 연쇄해서 곱한다.

### F3: 올해 목표 연봉 + 공유 카드
- AC-1: [E] When Result에 진입하면, 화면 최상단에 "올해({Y}) 목표 연봉"을 formatCurrency 원 단위로 표시하고, 바로 아래에 "작년 연봉 대비 +Z.Z% 인상 필요"를 표시한다. 그 아래 ListRow 두 줄 "작년 구매력 유지선 A"와 "첫 해 구매력 회복선 B"에 각각 금액을 보여 준다.
  - Y = 기기 현재 연도, L = CPI 데이터의 최신 확정 연도, n = max(0, Y − L)
  - A = S_last × Π_{t=last+1..L}(1 + r_t) × 1.02ⁿ
  - B = S_first × Π_{t=first+1..L}(1 + r_t) × 1.02ⁿ
  - 목표 = max(A, B)를 만원 단위로 올림, Z = 목표 ÷ S_last − 1
  - 검증 예시(F2-AC-3 픽스처, Y = 2026): A = 44,880,000원, B = 46,410,000원, 목표 "46,410,000원", "+5.5% 인상 필요"
- AC-2: [U] 목표 연봉 아래에 다음 가정 문구가 보인다. "올해 물가는 한국은행 물가안정목표 2%로 가정했어요 · 세전 기준 참고용". n ≥ 2이면 "물가 데이터가 {L}년까지만 있어요" 경고 Paragraph가 추가로 보인다.
- AC-3: [E] When "공유 카드 저장"을 누르면, 시스템은 Canvas 2D로 1080×1350 PNG를 만든다. 카드에는 앱 이름, 누적 구매력 변화율, 필요 인상률, 연도별 실질 인상률(최근 4행), 출처 한 줄이 들어간다. Switch "연봉 금액 표시"가 꺼져 있으면(기본값) 카드에 원 단위 금액이 하나도 없고, 켜져 있으면 목표 연봉 금액이 포함된다.
- AC-4: [E] 저장 방식과 결과 안내:
  - `navigator.canShare({ files })`가 true면 `navigator.share`로 파일을 넘기고, 아니면 `<a download="real-raise-check.png">`로 저장한다.
  - 성공하면 Toast "이미지를 저장했어요"를 띄운다.
  - 예외가 나면 Toast "저장하지 못했어요. 다시 시도해 주세요"를 띄우고 console.error는 출력하지 않는다.
  - 사용자가 공유를 취소하면(AbortError) Toast를 띄우지 않는다.
- AC-5: [S] 카드를 만드는 동안 버튼은 `loading` 상태이고 다시 눌러도 동작하지 않는다.

### 필수 AC (모든 QuickApp에 포함)
- AC-INPUT-1: [W] 입력된 연도가 2개 미만이면 "계산하기" CTA는 disabled이고, SubmitFooter hint에 "연봉을 2개 연도 이상 입력해 주세요"가 보인다. TextField hasError는 사용자가 그 칸을 한 번 이상 건드린(blur) 뒤에만 켜진다. 첫 화면에서는 빨간 칸이 0개다.
- AC-INPUT-2: [W] 연봉이 0 이하이거나 100,000만원(10억원)을 넘으면 해당 TextField에 hasError와 help "1만원 ~ 100,000만원 사이로 입력해 주세요"가 보인다. 오류 칸이 하나라도 있으면 CTA는 disabled다.
- **AC-INPUT-3 (추가)**: [W] If 연봉 TextField에 들어오려는 값에서 콤마를 뺀 나머지에 숫자(0-9)가 아닌 문자가 하나라도 있으면(".", "-", "+", "$", 공백, 한글, 영문 등), 그 입력(타이핑 한 번 또는 붙여넣기 한 번)은 반영되지 않고 칸에는 직전 값이 그대로 남는다.
  - 검증(붙여넣기): 빈 칸에 "4200.5", "4$00", "abc", "-5000"을 각각 붙여넣으면 칸은 빈 채로 남고 localStorage 값도 바뀌지 않는다.
  - 검증(타이핑): "4,200"인 칸에서 "."을 누르면 "4,200"이 유지된다. "4", "$", "0", "0"을 차례로 누르면 "$"만 무시되어 "400"이 된다.
  - 앞자리 0은 정수로 바꿀 때 사라진다: "0042"를 입력하면 42로 저장되고 "42"로 표시된다.
  - 숫자가 아닌 문자는 입력 단계에서 막히므로, 저장값은 항상 정수(만원)다. 소수점 반올림·내림 규칙은 두지 않는다.
- AC-EMPTY: [S] 저장된 입력 연도가 2개 미만인 상태로 /result에 직접 들어오면 Empty State(TDS Pattern E)가 보인다: 제목 "입력한 연봉이 부족해요", 설명 "2개 연도 이상 입력하면 실질 인상률을 보여드려요", 버튼 "연봉 입력하러 가기"(→ /). Home 첫 진입(저장값 없음)에서는 슬롯 위에 안내 Paragraph "최근 연봉을 입력하면 물가를 뺀 진짜 인상률을 알려드려요"가 보인다.
- AC-LOADING: [S] 공유 카드를 만드는 동안 Button loading(Spinner)이 보인다. 계산은 동기 순수 함수라 별도 로딩 화면은 없다.
- AC-ERROR: [W] localStorage 값을 파싱하지 못하거나 계산 중 예외가 나면 Result에 "결과를 불러오지 못했어요" 문구와 "다시 시도"(저장값 재로딩 후 재계산), "입력 다시 하기"(→ /) 버튼 2개가 보인다. 이 경우 손상된 저장값은 삭제한다.
- **AC-STORAGE-1 (추가)**: [W] If localStorage 쓰기(`setItem`/`removeItem`)가 예외를 던지면(QuotaExceededError, 저장소 차단 등):
  - 앱은 멈추지 않는다. 입력한 값은 화면에 그대로 남고, 사용자는 계속 입력하고 "계산하기"를 누를 수 있다.
  - Home에 Toast "저장하지 못했어요. 앱을 닫으면 입력이 사라질 수 있어요"를 띄운다. 연속으로 실패하는 동안에는 1번만 띄운다. 그 뒤 저장이 한 번 성공하고 다시 실패하면 그때 1번 더 띄운다.
  - entriesStore는 같은 세션 동안 메모리 사본을 가진다. 그래서 저장이 실패한 상태에서 "계산하기" → /result로 가도 화면에 입력한 값으로 결과가 나온다(Empty State가 아니다).
  - "전체 지우기"에서 삭제가 실패해도 화면과 메모리 사본은 비워지고, Toast "지우지 못했어요. 다시 시도해 주세요"가 보인다.
  - 이 경로들에서 console.error는 0개다.
  - 검증: 테스트에서 `localStorage.setItem`이 throw하도록 mock한다. 2개 연도를 입력하면 Toast가 정확히 1회 뜬다. "계산하기"를 누르면 Result에 목표 연봉 금액이 표시된다.
- AC-A11Y-1: [U] 모든 Button과 TextField에 aria-label이 있다(예: 연봉 칸 "2023년 세전 연봉(만원)").
- AC-A11Y-2: [U] 모든 터치 타겟은 최소 44×44px다. TDS 기본 크기를 그대로 쓰고 덮어쓰지 않는다.
- AC-A11Y-3: [U] 화면 색은 vars.color 토큰만 쓰고 HEX 하드코딩은 0개다. Canvas 카드 색도 `getComputedStyle`로 토큰의 CSS 변수 값을 읽어 쓴다.
- AC-REWARD: [U] 잠글 만한 더 깊은 층이 없으므로 TossRewardAd는 쓰지 않는다. Result 맨 아래(공유 버튼 아래)에 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 1개만 있고, Home에는 광고가 없다.
- **AC-AD-1 (추가)**: [W] If 배너 광고가 표시되지 않으면(채울 광고 없음, 네트워크 실패, `VITE_TOSS_AD_GROUP_ID`가 빈 값인 빌드):
  - Result의 1~5 블록(목표 연봉 블록 ~ "다시 입력하기")은 광고와 상관없이 그대로 보이고 동작한다.
  - 광고 자리에는 에러 문구, Toast, 대체 안내를 띄우지 않는다.
  - Result가 AC-ERROR 에러 화면이나 흰 화면으로 바뀌지 않는다. 이를 위해 AdSlot은 계산 결과 분기(결과/Empty/에러) 판정에 영향을 주지 않는 위치에 둔다.
  - 템플릿 AdSlot 컴포넌트 자체는 수정하지 않는다.
  - 검증: `VITE_TOSS_AD_GROUP_ID`를 비운 채로 빌드한다. 정상 입력으로 /result에 들어가면 목표 연봉, 누적 카드, 막대, 공유 버튼이 모두 보이고, Toast 0개, console.error 0개다.
- AC-FORMAT: [U] 원 단위 금액은 formatCurrency(46,410,000원), 만원 입력값은 formatNumber(4,200)로 표시한다.
- AC-REVIEW-1: [W] 외부 도메인으로 이탈(outlink)하지 않는다. KOSIS 링크도 텍스트로만 표기한다.
- AC-REVIEW-2: [U] 정상 흐름과 오류 흐름 모두에서 console.error는 0개다.
- AC-REVIEW-3: [W] 외부 로깅(GA, Amplitude 등)을 쓰지 않는다.
- AC-KEYBOARD: [E] TextField에 포커스가 가면 해당 칸이 `scrollIntoView({ block: 'center' })`로 화면 안에 들어온다. 키보드가 열린 상태에서도 SubmitFooter의 "계산하기"가 가려지지 않는다.

### Screen Definitions

#### Home (/)
- Top: "진짜연봉체크"
- 안내 Paragraph.Text(저장값이 없을 때만 보임)
- 연도 슬롯 5개: ListRow + 연봉 TextField(만원) + 메모 TextField
- "전체 지우기" 텍스트 Button과 AlertDialog
- SubmitFooter: "계산하기" Button + hint
- Toast: 저장 실패 안내 **(추가, AC-STORAGE-1)**
- 상태: 초기(빈 입력, 오류 표시 없음), 입력 중(자동 저장), 검증 오류(help 텍스트), 저장 실패(Toast 1회, 입력 계속 가능) **(추가)**
- 네비게이션: "계산하기" → `navigate('/result')`. 데이터는 localStorage가 원천이고, Result가 직접 읽어서 새로고침해도 결과가 유지된다. 저장에 실패한 세션에서는 entriesStore 메모리 사본을 읽는다 **(추가)**.

#### Result (/result)
1. 목표 연봉 블록(무료 핵심 답): 목표 연봉, 필요 인상률, 유지선 A·회복선 B ListRow, 가정 문구
2. 누적 구매력 카드
3. 연도별 명목/실질 비교 막대(RaiseBars)와 출처 줄
4. Switch "연봉 금액 표시" + "공유 카드 저장" Button
5. "다시 입력하기" Button(→ /)
6. AdSlot 배너. 광고가 실패해도 1~5에는 영향이 없다 **(추가, AC-AD-1)**.
- 상태: 결과 표시, Empty, 에러, 카드 생성 중

### Data Model
```typescript
// src/lib/types.ts
export interface SalaryEntry {
  year: number;          // CPI 데이터에 있는 연도만
  amountMan: number;     // 세전 연봉, 만원 단위 정수 (1~100000)
  memo?: string;         // 최대 10자, 예: "이직"
}

export interface CpiData {
  source: string;        // "통계청 소비자물가지수 연간 상승률(KOSIS)"
  asOf: string;          // 데이터 수록 기준, 예: "2025년 연간"
  rates: { year: number; ratePct: number }[]; // 전년 대비 %
}

export interface PairRow {
  fromYear: number; toYear: number; gapYears: number;
  fromMemo?: string; toMemo?: string;
  nominalPct: number; realPct: number;
}

export interface AppResult {
  rows: PairRow[];
  cumulativeRealPct: number;
  cumulativeNominalPct: number;
  firstYear: number; lastYear: number;
  targetYear: number;            // Y
  keepLineWon: number;           // A
  restoreLineWon: number;        // B
  targetWon: number;             // max(A,B), 만원 단위 올림
  requiredRaisePct: number;      // Z
  staleYears: number;            // n
}

// (추가) 연봉 입력 정제 결과 — AC-INPUT-3
export type AmountInputResult =
  | { accept: false }                      // 숫자·콤마 외 문자 포함 → 직전 값 유지
  | { accept: true; value: number | null } // null = 빈 칸(개별 삭제)

// (추가) 저장 결과 — AC-STORAGE-1
export interface SaveResult { ok: boolean }

// Route state 미사용 — Result는 entriesStore에서 직접 읽는다
```

번들 CPI 초안(`src/data/cpi.ts`). **출시 전 KOSIS 원자료와 대조해 확정해야 합니다** (Open Questions 1 참고).

| 연도 | 전년 대비 % |
|---|---|
| 2021 | 2.5 |
| 2022 | 5.1 |
| 2023 | 3.6 |
| 2024 | 2.3 |
| 2025 | 2.1 (확인 필요) |

## TASK

### Epic 1: Data Layer
- **Task 1: types + CPI 번들**
  - Files: `src/lib/types.ts`, `src/data/cpi.ts`
  - Covers: F2-AC-5, F1-AC-1(연도 슬롯 범위)
  - DoD: 위 Data Model 타입을 export한다(추가된 `AmountInputResult`, `SaveResult` 포함). `cpi.ts`는 `source`, `asOf`, `rates`를 export하고, `getSlotYears()`는 최신 5개 연도를 오름차순으로 돌려준다. 값은 KOSIS와 대조한 뒤 주석에 조회일을 적는다.
- **Task 2: 계산기(순수 함수) + 테스트**
  - Files: `src/lib/calculator.ts`, `src/lib/calculator.test.ts` (템플릿에 vitest가 없으면 devDependency로 추가)
  - Covers: F2-AC-1, F2-AC-3, F2-AC-6, F3-AC-1(계산), F3-AC-2(n 계산), AC-INPUT-2(`validateAmount`), **AC-INPUT-3(`parseAmountInput`) (추가)**
  - DoD: `calculate(entries, cpi, currentYear): AppResult`는 CPI를 인자로 주입받는다. 테스트는 F2-AC-1, F2-AC-3, F3-AC-1의 검증 예시(+1.4%, −3.3%, 46,410,000원, +5.5%)와 빈 연도 연쇄 케이스, n = 2 케이스를 통과해야 한다.
  - **(추가)** `parseAmountInput(raw: string): AmountInputResult`는 콤마를 제거한 뒤 숫자 외 문자가 있으면 `{ accept: false }`, 빈 문자열이면 `{ accept: true, value: null }`, 나머지는 정수로 바꿔 돌려준다. 테스트 케이스: "4,200"→4200, "0042"→42, ""→null, "4200.5"·"4$00"·"abc"·"-5000"→accept false.
- **Task 3: 저장소**
  - Files: `src/lib/entriesStore.ts`
  - Covers: F1-AC-2, F1-AC-5, AC-ERROR(손상 데이터), **AC-STORAGE-1(저장 실패·메모리 사본) (추가)**
  - DoD: 템플릿의 storage.ts를 써서 `load/save/clear`를 만든다. load는 스키마 검사에 실패하면 키를 삭제하고 `{ ok: false }`를 돌려준다. 빈 금액 항목은 저장하지 않는다.
  - **(추가)** `save`와 `clear`는 메모리 사본을 먼저 갱신한 뒤 localStorage 쓰기를 try/catch로 감싸고 `SaveResult`를 돌려준다. 예외가 나도 throw하지 않고 console.error도 출력하지 않는다. `load`는 같은 세션의 메모리 사본이 있으면 그것을 우선해서 돌려준다. 테스트: `setItem`이 throw하도록 mock한 상태에서 `save` → `{ ok: false }`, 이어서 `load` → 방금 저장하려던 항목이 그대로 나온다.

### Epic 2: Pages
- **Task 4: Home**
  - Files: `src/pages/Home.tsx`
  - Covers: F1-AC-1, F1-AC-3, F1-AC-4, AC-INPUT-1, AC-INPUT-2, AC-EMPTY(Home 안내), AC-KEYBOARD, AC-A11Y-1, AC-FORMAT, **AC-INPUT-3(입력 반영), AC-STORAGE-1(Toast) (추가)**
  - DoD: TDS(Top, ListRow, TextField, Button, AlertDialog, Paragraph.Text, Spacing, **Toast (추가)**)만 쓴다. hasError는 touched일 때만 켠다. 입력 연도가 2개 미만이면 CTA disabled + hint. 포커스 시 scrollIntoView. 인라인 여백 덮어쓰기는 0개다.
  - **(추가)** 연봉 onChange는 `parseAmountInput`이 `accept: false`를 돌려주면 state를 바꾸지 않는다. `save`가 `ok: false`이고 직전 저장은 성공했을 때만 저장 실패 Toast를 띄운다(연속 실패 중에는 1회). 전체 지우기 실패 시에는 "지우지 못했어요. 다시 시도해 주세요" Toast를 띄운다.
- **Task 5: RaiseBars 컴포넌트**
  - Files: `src/components/RaiseBars.tsx`
  - Covers: F2-AC-2, F2-AC-4, F2-AC-6(라벨), AC-A11Y-3
  - DoD: `PairRow[]`를 받아 0 기준축을 가운데 둔 막대를 그린다. 커스텀 CSS는 flex 배치와 width%에만 쓴다. 음수 실질은 red500 + "구매력 감소", 메모는 라벨에 붙인다. HEX는 0개다.
- **Task 6: Result**
  - Files: `src/pages/Result.tsx`
  - Covers: F2-AC-1(표시), F2-AC-3, F2-AC-5, F3-AC-1, F3-AC-2, AC-EMPTY, AC-ERROR, AC-REWARD, AC-FORMAT, **AC-AD-1 (추가)**
  - DoD: entriesStore → calculate → Screen Definitions 순서대로 렌더한다. Empty/에러 분기와 재시도가 동작한다. 하단에 AdSlot 1개, TossRewardAd는 쓰지 않는다.
  - **(추가)** AdSlot은 결과/Empty/에러 분기를 정하는 try/catch와 계산 로직 밖에 두고, 템플릿 컴포넌트는 수정하지 않는다. `VITE_TOSS_AD_GROUP_ID`를 비운 빌드로 AC-AD-1 검증 절차를 통과해야 한다.
- **Task 7: 공유 카드**
  - Files: `src/lib/shareCard.ts`, `src/components/ShareCardButton.tsx`
  - Covers: F3-AC-3, F3-AC-4, F3-AC-5, AC-LOADING
  - DoD: Canvas 1080×1350 PNG를 만든다. 색은 getComputedStyle로 토큰 값을 읽는다. Switch가 꺼져 있으면 금액 텍스트가 0개다. share → download 순서로 폴백하고, 결과는 Toast로 알리며 AbortError에는 Toast를 띄우지 않는다. 생성 중에는 버튼 loading.

### Epic 3: Integration
- **Task 8: 라우팅 + 검수 점검**
  - Files: `src/App.tsx`
  - Covers: AC-REVIEW-1, AC-REVIEW-2, AC-REVIEW-3, AC-A11Y-2
  - DoD: `/`와 `/result` 라우트를 연결한다. 프로젝트 전체에서 외부 URL 이동, console.error, 외부 로깅 SDK가 각각 0건임을 grep으로 확인한다. TDS 터치 타겟 크기는 덮어쓰지 않는다.

## AC Coverage
- Total: **33개** (F1 5 + F2 6 + F3 5 + 필수 17) — 30개에서 AC-INPUT-3, AC-STORAGE-1, AC-AD-1 3개 추가
- Covered: 33개 (100%)
  - AC-INPUT-3 → Task 2, Task 4
  - AC-STORAGE-1 → Task 3, Task 4
  - AC-AD-1 → Task 6
- Uncovered: 0개

## Open Questions
1. **CPI 값 확정**: 위 표는 초안입니다. 특히 2025년 2.1%는 KOSIS "소비자물가지수 전년 대비 등락률(연간)" 원자료와 대조해야 합니다. 2026년 연간값이 공표되면(통상 연말·연초) 데이터를 갱신하고 재빌드·재배포해야 하는데, 이 갱신 주기를 누가 맡을지 정해야 합니다.
2. **이미지 저장 경로**: 토스 WebView에서 `<a download>`와 `navigator.share({ files })`가 실제로 동작하는지 확인되지 않았습니다. 앱인토스에 이미지·파일 저장용 공식 API가 있는지 콘솔 문서로 확인한 뒤 폴백 순서를 정해야 합니다.
3. **"세전 연봉"의 범위**: 성과급·인센티브를 포함할지에 대한 안내 문구가 필요한지 정해야 합니다.
4. **올해 물가 가정**: 한국은행 물가안정목표 2% 대신 "직전 확정 연도 상승률"을 선택지로 줄지는 MVP 이후로 미뤘습니다.