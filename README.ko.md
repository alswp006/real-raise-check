🇰🇷 [English](./README.md)

# 진짜연봉체크 — Real Raise Check

연봉 인상 시 물가상승률을 제외한 실질 인상률을 계산하세요. 이 토스 미니앱은 한국 사용자가 시간이 지남에 따라 명목 연봉 인상에서 물가지수(CPI)를 빼고 실제 구매력 변화를 이해하도록 도와줍니다.

여러 연도에 걸쳐 연간 연봉을 입력하면 앱이 실질 인상률, 목표 연봉 추천, 연도별 성장 추이를 계산해줍니다. 결과를 토스의 메시징 플랫폼으로 친구와 직접 공유할 수 있습니다.

## 기능

- 📊 **다년간 연봉 추적** — 2년 이상 연봉을 선택 메모와 함께 입력
- 💹 **실질 인상률 계산** — 물가상승률(CPI)을 제외한 실제 구매력 변화 표시
- 🎯 **목표 연봉 추천** — 두 가지 경로 제시: 물가 인상률만큼 인상 vs 구매력 회복
- 📈 **연도별 성장 시각화** — 실질 및 명목 인상률의 막대 그래프
- 💾 **기기 저장소에 자동 저장** — 입력 내용이 자동으로 저장됨
- 🔗 **결과 공유** — 토스 네이티브 공유 대화상자로 계산 결과 공유
- 📢 **배너 광고** — 토스 AdMob 지원

## 기술 스택

- **프레임워크**: Vite + React 18
- **라우팅**: React Router v7
- **디자인 시스템**: Toss Design System (TDS Mobile)
- **모바일 SDK**: App-in-Toss Web Framework
- **상태 관리**: React hooks + localStorage / SDK Storage
- **테스트**: Vitest + @testing-library/react + Playwright
- **스타일링**: TDS 컴포넌트 + Emotion (CSS-in-JS)

## 시작하기

### 의존성 설치
```bash
npm install
```

### 타입 체킹 실행
```bash
npx tsc --noEmit
```

### 테스트 실행
```bash
npx vitest run
```

### 비주얼 회귀 테스트
```bash
npx playwright install chromium  # 첫 실행 시에만
npm run test:visual
```

### 프로덕션 빌드
```bash
npx vite build
```

### 앱인토스 배포
```bash
npx ait build
```

그 다음 번들을 토스 개발자 콘솔에 제출하여 검수를 받습니다.

## 환경 변수

| 변수 | 설명 | 필수 |
|---|---|---|
| `VITE_TOSS_AD_GROUP_ID` | 토스 개발자 콘솔의 AdMob 배너 광고 슬롯 ID | 아니요 |
| `VITE_TOSS_IAP_SKU` | 인앱 구매 SKU (향후 사용 예약) | 아니요 |
| `VITE_TOSS_PROMOTION_CODE` | 콘솔의 프로모션 보상 코드 | 아니요 |
| `VITE_SHARE_OG_URL` | 공유 미리보기 OG 이미지 URL (카카오, SMS) | 아니요 |

`.env.example`을 `.env`로 복사하고 토스 개발자 콘솔의 값으로 채웁니다.

## 프로젝트 구조

```
src/
  pages/          # 화면 컴포넌트 (Home, Result)
  components/     # TDS 기반 재사용 가능한 UI 컴포넌트
  lib/            # 비즈니스 로직 (계산기, 저장소, 분석, 공유)
  data/           # CPI 물가상승률 데이터
  __tests__/      # Vitest 테스트 파일
e2e/              # Playwright 비주얼 회귀 테스트
apps-in-toss.config.ts  # 토스 SDK 설정
```

## 배포

1. **빌드**: `npx vite build`로 프로덕션 번들 생성
2. **토스 번들**: `npx ait build`로 앱인토스용 패킹
3. **검수**: [토스 개발자 콘솔](https://console.tossmini.com)에서 제출
4. **호스팅**: 토스 CDN이 `https://<appName>.web.tossmini.com`에서 앱을 호스팅

앱은 CSR(Client-Side Rendering)만 지원합니다 — SSR이나 서버 측 코드는 없습니다. 모든 데이터는 기기 저장소에 저장됩니다.

## 라이선스

MIT
