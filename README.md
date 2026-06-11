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

- **AI optimization** — paste a job description and get an ATS match score, keyword gap analysis, and per-section rewrites
- **ATS checker** — instant client-side audit of contact completeness, content quality, formatting, and keyword coverage — no AI key needed
- **Cover letter generator** — AI writes a tailored cover letter from your resume and job description, with tone selection
- **Follow-up email generator** — thank-you, application follow-up, status-inquiry, and referral-request emails with tone selection and one-click hand-off to your mail app
- **AI proofreading** — spelling, grammar, punctuation, consistency, and clarity check with per-field apply / apply-all fixes that never rewrite your content
- **Interview prep** — generate tailored answers and STAR stories; load common questions from a built-in question bank
- **Mock interview** — an interactive AI interviewer asks questions one at a time, scores each answer, and gives strengths, fixes, and a model answer; supports voice dictation
- **Resume translation** — translate the entire resume into another language (10 built-in choices or any custom language) and save it as a new linked copy; names, dates, links, and technical terms are preserved
- **JSON Resume interchange** — export to and import from the [JSON Resume](https://jsonresume.org) standard for portability with other tools
- **Job versions** — fork your resume for a specific role, track application status (draft → offer), and compare the tailored copy against the original
- **Undo / redo** — bounded revision history persisted in localStorage; coalesced so fast typing creates one snapshot
- **9 resume styles** — Classic, Modern, Executive, Minimal, Elegant, Academic, Split, Timeline, and a fully configurable **Custom** style
- **Live theme colour** — change the accent colour and the preview updates instantly
- **PDF import** — upload an existing resume (LinkedIn "Save to PDF" exports included); enable AI-powered parsing in Settings for higher accuracy
- **One-click PDF export** — pixel-perfect PDF powered by Puppeteer, in A4 or US Letter with margin presets
- **DOCX export** — download the resume as a Word document, generated fully client-side
- **Private share links** — a read-only copy is compressed into the URL fragment (never uploaded), with a QR code for small resumes; recipients can view and import it
- **Autosave** — changes are debounced and persisted to IndexedDB
- **Fully private** — all data stays in the browser; the only outbound traffic is your own AI API calls
- **Bring your own AI** — configure OpenAI, Claude, Gemini, Grok, DeepSeek, Qianwen, Kimi, Doubao, or Wenyanyixin

---

## Getting Started

**Prerequisites:** Node.js 20+, .NET SDK 10+

```bash
# 1. Clone
git clone https://github.com/ttang1024/Smart_CV.git && cd Smart_CV

# 2. Start backend (http://localhost:5167)
cd SmartCV.API && dotnet run

# 3. Start frontend (http://localhost:3000) — in a second terminal
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

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router, static export), React 19, TypeScript      |
| Styling    | Tailwind CSS                                                      |
| State      | Zustand, IndexedDB (`idb`), localStorage                          |
| PDF export | PuppeteerSharp (headless Chromium)                                |
| DOCX export | `docx` (fully client-side)                                       |
| PDF import | pdfjs-dist + Tesseract.js OCR + optional AI parsing               |
| Backend    | .NET 10 Minimal API                                               |
| i18n       | i18next (en / es / zh-CN / zh-TW)                                 |
| Deployment | Docker → Amazon ECR → AWS App Runner (ap-southeast-2)             |

---

## Architecture

```
Browser (Next.js SSG)
  │  IndexedDB      — resumes, optimization sessions
  │  localStorage   — AI settings, job applications, revision history
  └─ /api ──► .NET 10 Minimal API
                  ├─ /api/ai/chat      — proxies to AI provider (avoids CORS, hides keys)
                  ├─ /api/pdf/parse    — extracts sections from uploaded PDFs (PdfPig)
                  └─ /api/pdf/generate — renders HTML to A4 PDF (Puppeteer/Chromium)
```

See [`tech/`](tech/) for detailed module documentation.

---

## Deployment

The app runs as a Docker container on AWS App Runner (region `ap-southeast-2`). The image is built locally with Docker, pushed to Amazon ECR, and served through App Runner's managed ingress. Infrastructure is declared in `aws/cloudformation.yml` and applied via the AWS CLI.

**Deploy infrastructure + app (first time or after infra changes):**

```bash
./deploy.sh          # deploys with a git-sha tag
./deploy.sh v1.2.0   # deploys with a specific tag
```

`deploy.sh` does four things in order:

1. Resolves the ECR registry endpoint from your AWS account ID
2. Creates the ECR repository if it doesn't exist
3. `docker build` + `docker push` — builds the Docker image locally and pushes it to ECR
4. `aws cloudformation deploy` — provisions or updates the App Runner service and IAM role from `aws/cloudformation.yml`

**Deploy app only (after frontend/backend code changes):**

```bash
./deploy-app.sh          # builds and deploys with a git-sha tag
./deploy-app.sh v1.2.0   # builds and deploys with a specific tag
```

`deploy-app.sh` skips the full infrastructure check and just runs `docker build`, `docker push`, and updates the CloudFormation stack with the new image tag. Use this for faster iteration when only application code has changed.

**Prerequisites:** Docker plus [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured (`aws configure` or environment variables) with permissions for ECR, CloudFormation, IAM, and App Runner.

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
