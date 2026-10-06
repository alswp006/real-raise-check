🇺🇸 [한국어](./README.ko.md)

# 진짜연봉체크 — Real Raise Check

Calculate your real salary raise after accounting for inflation. This Toss mini-app helps Korean users understand their purchasing power over time by removing CPI (Consumer Price Index) from nominal salary increases.

Input your annual salary across multiple years, and the app calculates your actual real raise, target salary recommendations, and year-over-year growth trends. Results can be shared directly with friends via Toss's messaging platform.

## Features

- 📊 **Multi-year salary tracking** — Input salary across 2+ years with optional notes
- 💹 **Real raise calculation** — Removes inflation (CPI) to show actual purchasing power change
- 🎯 **Target salary recommendations** — Shows two paths: inflation-only growth and purchasing power recovery
- 📈 **Year-over-year visualization** — Bar charts of real and nominal raise rates
- 💾 **Local persistence** — Saves entries to device storage automatically
- 🔗 **Share results** — Share calculations via Toss's native share dialog
- 📢 **Banner ads** — Integrated Toss AdMob support

## Tech Stack

- **Framework**: Vite + React 18
- **Routing**: React Router v7
- **Design System**: Toss Design System (TDS Mobile)
- **Mobile SDK**: App-in-Toss Web Framework
- **State Management**: React hooks + localStorage / SDK Storage
- **Testing**: Vitest + @testing-library/react + Playwright
- **Styling**: TDS components + Emotion (CSS-in-JS)

## Getting Started

### Install dependencies
```bash
npm install
```

### Run type checking
```bash
npx tsc --noEmit
```

### Run tests
```bash
npx vitest run
```

### Visual regression tests
```bash
npx playwright install chromium  # First time only
npm run test:visual
```

### Production build
```bash
npx vite build
```

### App-in-Toss deployment
```bash
npx ait build
```
Then submit the bundle to the Toss developer console for review.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_TOSS_AD_GROUP_ID` | Toss AdMob banner ad slot ID from developer console | No |
| `VITE_TOSS_IAP_SKU` | In-app purchase SKU (reserved for future use) | No |
| `VITE_TOSS_PROMOTION_CODE` | Promotion reward code from console | No |
| `VITE_SHARE_OG_URL` | OG image URL for share preview (Kakao, SMS) | No |

Copy `.env.example` to `.env` and fill in values from the Toss developer console.

## Project Structure

```
src/
  pages/          # Screen components (Home, Result)
  components/     # Reusable TDS-based UI components
  lib/            # Business logic (calculator, storage, analytics, share)
  data/           # CPI inflation data
  __tests__/      # Vitest test files
e2e/              # Playwright visual regression tests
apps-in-toss.config.ts  # Toss SDK configuration
```

## Deployment

1. **Build**: `npx vite build` creates a production bundle
2. **Toss Bundle**: `npx ait build` packages for App-in-Toss
3. **Review**: Submit via [Toss Developer Console](https://console.tossmini.com)
4. **Hosting**: Toss CDN hosts the app at `https://<appName>.web.tossmini.com`

The app runs as CSR (Client-Side Rendering) only — no SSR or server-side code. All data persists in device storage.

## License

MIT
