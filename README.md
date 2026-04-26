# SmartCV

AI-powered resume builder. Runs entirely in your browser — no account, no cloud storage, no data leaving your device.

![stack](https://img.shields.io/badge/stack-.NET%2010%20%2B%20React%2019-6366f1?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-f59e0b?style=flat-square)

---

## Preview

![SmartCV demo](demos/preview.gif)

---

## Features

- **AI optimization** — paste a job description and the AI rewrites your bullets and summary with targeted keywords to pass ATS screening
- **10 resume styles** — Classic, Modern, Executive, Minimal, Creative, Elegant, Academic, Split, Timeline, and a fully configurable **Custom** style with swappable layouts, section styles, and more
- **Live theme colour** — change the accent colour and the preview updates instantly
- **PDF import** — upload an existing resume and every section is extracted automatically
- **One-click PDF export** — pixel-perfect A4 PDF powered by Puppeteer
- **Autosave** — changes are debounced and persisted to IndexedDB
- **Fully private** — all data stays in the browser; the only outbound traffic is your own AI API calls
- **Bring your own AI** — configure OpenAI, Claude, Gemini, Grok, or Qianwen in Settings

---

## Getting Started

**Prerequisites:** Node.js 20+, .NET SDK 10+

```bash
# 1. Clone
git clone https://github.com/ttang1024/Smart_CV.git && cd Smart_CV

# 2. Start backend (http://localhost:5173)
cd SmartCV.API && dotnet run

# 3. Start frontend (http://localhost:5173) — in a second terminal
cd SmartCV.Web && npm install && npm run dev
```

Then go to **Settings** to add an API key for your preferred AI provider.

---

## Production Build

The React app outputs directly to `SmartCV.API/wwwroot/`, so a single .NET process serves both the API and the SPA.

```bash
cd SmartCV.Web && npm run build
cd ../SmartCV.API && dotnet publish -c Release -o ./publish
./publish/SmartCV.API   # or SmartCV.API.exe on Windows
```

---

## Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Frontend   | React 19, TypeScript, Tailwind CSS v4, Vite 8         |
| State      | Zustand, IndexedDB (`idb`), localStorage              |
| PDF export | PuppeteerSharp (Chromium)                             |
| PDF import | pdfjs-dist                                            |
| Backend    | .NET 10 Minimal API                                   |
| Deployment | Docker → Azure Container Registry → Azure App Service |

---

## Architecture

```
Browser (React SPA)
  │  IndexedDB — resume data
  │  localStorage — AI settings
  └─ /api ──► .NET 10 Minimal API
                  ├─ /api/ai/chat      — proxies to AI provider (avoids CORS, keeps keys server-side)
                  ├─ /api/pdf/parse    — extracts sections from uploaded PDFs
                  └─ /api/pdf/generate — renders HTML to A4 PDF via Puppeteer
```

---

## Deployment

The app runs as a Docker container on Azure App Service. The image is built remotely via ACR Tasks (no local Docker required) and served by a Linux App Service that pulls from the private registry.

**One-time infrastructure setup:**

```bash
az group create -n smart-cv-rg -l eastus
```

**Deploy infrastructure + app (first time or after infra changes):**

```bash
./deploy.sh          # deploys with tag "latest"
./deploy.sh v1.2.0   # deploys with a specific tag
```

`deploy.sh` does three things in order:

1. `az deployment group create` — provisions ACR, App Service Plan, and Web App from `azure/main.bicep`
2. `az acr build` — builds the Docker image in Azure and pushes it to the registry
3. `az webapp restart` — restarts the app to pull the new image

**Deploy app only (after frontend/backend code changes):**

```bash
./deploy-app.sh          # builds and deploys with tag "latest"
./deploy-app.sh v1.2.0   # builds and deploys with a specific tag
```

`deploy-app.sh` skips the Bicep infrastructure step and just runs `az acr build` + `az webapp restart`. Use this for faster iteration when only application code has changed.

**Prerequisites:** [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) logged in (`az login`) with Contributor access to the resource group.

---

## Contributing

Open an issue before submitting a large PR. For small fixes, a PR is fine directly.

```bash
git checkout -b feat/your-feature
cd SmartCV.Web && npm run lint
# open PR against main
```

---

## License

[MIT](LICENSE)
