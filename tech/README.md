# SmartCV — Technical Overview

One-stop index of every major feature module. Each linked file covers: back-end implementation, front-end interaction, API contract, and flow/architecture diagrams.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          Browser (Next.js SSG)                               │
│                                                                              │
│  ┌─────────────┐  ┌──────────────────────────────────────────────────────┐  │
│  │  HomePage   │  │  EditorPage                                          │  │
│  └─────────────┘  │  ├─ ResumeEditor  (left panel)                       │  │
│                   │  ├─ ResumePreview (centre panel)                      │  │
│                   │  └─ Side panels (right, resizable):                   │  │
│                   │       ai    → AIOptimizationPanel                     │  │
│                   │       ats   → ATSCheckerPanel                         │  │
│                   │       cover → CoverLetterPanel                        │  │
│                   │       jobs  → JobVersionsPanel                        │  │
│                   └──────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      Zustand State Layer                             │   │
│  │         resumeStore  ◄──────────────►  settingsStore                │   │
│  └───────────┬──────────────────────────────────┬────────────────────┘    │
│              │                                  │                           │
│  ┌───────────▼──────────┐         ┌─────────────▼──────────────────────┐  │
│  │  IndexedDB (idb)     │         │  localStorage                       │  │
│  │  resumes / optims    │         │  AI settings                        │  │
│  └──────────────────────┘         │  Job applications                   │  │
│                                   │  Revision history (undo snapshots)  │  │
│  Services:                        └────────────────────────────────────┘   │
│  resumeParserApi · aiService · atsChecker · pdfParser                       │
└──────────────────────────────────────────────────────────────────────────┬──┘
                               HTTP                                        │
┌──────────────────────────────────────────────────────────────────────────▼──┐
│                      ASP.NET Core 10 (Minimal API)                          │
│                                                                              │
│   POST /api/pdf/parse        →  PdfResumeParserService (PdfPig)            │
│   POST /api/pdf/parse-text   →  PdfResumeParserService.ParseText            │
│   POST /api/pdf/generate     →  PdfGenerationService (Puppeteer)           │
│   POST /api/ai/chat          →  AIProxyService (multi-provider)            │
│    GET /api/ai/health        →  health check                                │
└─────────────────────────────────────────────────────────────────────────────┘
                        │ HTTPS / REST
        ┌───────────────┼──────────────────────────┐
        │               │                          │
  OpenAI API      Anthropic API             Gemini API
  (+ Grok,        (Claude)                  (+ DeepSeek,
   DeepSeek…)                                Kimi, etc.)
```

---

## Module Index

| Module | Description | Detail |
|---|---|---|
| **PDF Parse** | Import a PDF resume → structured `Resume` JSON | [parse.md](parse.md) |
| **AI Proxy** | Route AI chat requests to 9 providers via unified API | [ai-proxy.md](ai-proxy.md) |
| **PDF Generate** | Export resume HTML → PDF via Puppeteer/Chromium | [pdf-generate.md](pdf-generate.md) |
| **AI Optimize** | ATS scoring, keyword gap analysis, section improvement | [ai-optimize.md](ai-optimize.md) |
| **ATS Checker** | Static client-side ATS readability audit (no AI needed) | [ats-checker.md](ats-checker.md) |
| **Cover Letter** | AI-generated cover letter from resume + job description | [cover-letter.md](cover-letter.md) |
| **Job Versions** | Fork & track tailored resume versions per job application | [job-versions.md](job-versions.md) |
| **Storage** | Client-side data persistence (IndexedDB + localStorage) | [storage.md](storage.md) |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Front-end framework | Next.js 15 (App Router, static export) |
| UI state | Zustand |
| Client DB | IndexedDB via `idb` |
| PDF text extraction (client) | pdf.js (`pdfjs-dist`) |
| OCR fallback | Tesseract.js |
| Back-end | ASP.NET Core 10 Minimal API (.NET 10) |
| PDF text extraction (server) | PdfPig |
| PDF generation | PuppeteerSharp + headless Chromium |
| AI providers | OpenAI, Claude, Gemini, Grok, DeepSeek, Qianwen, Kimi, Doubao, Wenyanyixin |
| Styling | Tailwind CSS |
| i18n | i18next (en / es / zh-CN / zh-TW) |
| Deployment | Azure App Service + Docker |
