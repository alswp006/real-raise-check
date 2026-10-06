# Sprint Contract — 패킷 0008
<!-- 파이프라인이 이 패킷을 위해 생성(순수 생성 콜) — 다른 패킷의 계약서가 아니다 -->

# Sprint Contract: Routing & Integration

## 만들 항목
- **src/App.tsx**: `<Routes>` 구조 구성 (`'/' → Home`, `'/result' → Result`, 미등록 경로 → `'/'` 리다이렉트), main.tsx는 수정 금지

## 사용할 TypeScript 타입
- `SalaryEntry`, `AppResult` (필요시 src/lib/types.ts에서 import)

## 검증 방법
1. Home 상단 '진짜연봉체크' + 연도 슬롯 5개 렌더 확인, '/result'에서 Result 렌더 확인, '/unknown'에서 '/'로 이동 확인
2. Home에서 유효한 2개 연도 입력 후 '계산하기' → '/result'에서 목표 연봉 표시, 새로고침 후에도 동일한 금액 표시
3. `grep -rnE "window\.open|location\.href\s*=|target=.?_blank" src` = 0건
4. `grep -rn "console.error" src` = 0건
5. `grep -rniE "gtag|amplitude|mixpanel|firebase/analytics" src package.json` = 0건
6. `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/pages src/components/RaiseBars.tsx src/components/ShareCardButton.tsx src/lib/shareCard.ts` = 0건
7. `npm run build` 및 `npx tsc --noEmit` 모두 에러 0개

## 절대 금지 사항
- main.tsx 수정
- 외부 URL 이동 코드 (window.open, location.href, target="_blank")
- console.error 사용
- 외부 로깅 라이브러리 (gtag, Amplitude, Mixpanel, Firebase Analytics)
- TDS 디자인 토큰 (색상 코드, 크기) 덮어쓰기
