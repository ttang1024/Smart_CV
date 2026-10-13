# SmartCV — Frontend

Next.js 16 (static export) + React 19 + TypeScript frontend.

For full documentation — setup, architecture, deployment, and contributing — see the **[root README](../README.md)**.

## Quick start

```bash
npm install
npm run dev        # dev server at http://localhost:3000 (expects the API on :5167)
npm run build      # production build → ../SmartCV.API/wwwroot
npm run lint       # ESLint
npm test           # Vitest unit tests
npm run test:e2e   # Playwright e2e against the dev server
E2E_BASE_URL=http://localhost:5167 npm run test:e2e   # …or against a running production build
```
