# PDF Generate Module

Converts the live resume HTML rendered in the browser into a pixel-perfect, print-ready A4 PDF using a headless Chromium instance on the server (PuppeteerSharp).

---

## Flow Chart

```mermaid
flowchart TD
    A([User clicks Download PDF]) --> B[ResumePreview: serialise\ncurrent layout to HTML string]
    B --> C[POST /api/pdf/generate\n{html, filename}]
    C --> D[PdfGenerationService.GenerateAsync]
    D --> E{_warmupTask\ncomplete?}
    E -- No --> F[Await Chromium\ndownload / startup]
    F --> G
    E -- Yes --> G[Puppeteer.LaunchAsync\nheadless Chromium]
    G --> H[page.SetContentAsync\nWaitUntil: Networkidle0]
    H --> I[EvaluateExpression\ndocument.fonts.ready]
    I --> J[page.PdfDataAsync\nA4, PrintBackground,\nPreferCSSPageSize]
    J --> K[Return application/pdf bytes]
    K --> L([Browser downloads filename.pdf])
```

---

## Front-End

### Components / Services

| File | Role |
|---|---|
| `SmartCV.Web/src/components/resume/ResumePreview.tsx` | Renders the current resume layout; triggers download |
| `SmartCV.Web/src/components/resume/layouts/*.tsx` | Layout components (Minimal, Modern, Classic, Elegant, Timeline, Academic, Creative, Executive, Split, Custom) |

### Interaction Logic

1. User clicks the **Download PDF** button in `ResumePreview.tsx`.
2. The component serialises the current rendered resume DOM (or reconstructs the HTML with inline styles) into a complete HTML string.
3. A `POST /api/pdf/generate` request is issued with `{ html, filename }`.
4. The API returns the PDF as `application/pdf` bytes which are streamed directly to the browser as a file download.

```typescript
// ResumePreview.tsx — download handler (conceptual)
async function handleDownloadPdf() {
  const html = buildResumeHtml(currentResume, selectedLayout, settings);
  const response = await fetch(`${API_BASE}/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename: `${currentResume.name}.pdf` }),
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${currentResume.name}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Layout System

10 layout components live in `src/components/resume/layouts/`. Each receives the same `Resume` prop and produces self-contained HTML/CSS.  
`ResumePreview.tsx` switches between them based on `settingsStore.layout`.

| Layout | File |
|---|---|
| Minimal | `MinimalLayout.tsx` |
| Modern | `ModernLayout.tsx` |
| Classic | `ClassicLayout.tsx` |
| Elegant | `ElegantLayout.tsx` |
| Timeline | `TimelineLayout.tsx` |
| Academic | `AcademicLayout.tsx` |
| Creative | `CreativeLayout.tsx` |
| Executive | `ExecutiveLayout.tsx` |
| Split | `SplitLayout.tsx` |
| Custom | `CustomLayout.tsx` |

---

## Back-End

**File:** `SmartCV.API/Services/PdfGenerationService.cs`

### API Endpoint

| Method | Path | Input | Output |
|---|---|---|---|
| `POST` | `/api/pdf/generate` | `{ "html": "...", "filename": "resume.pdf" }` | `application/pdf` binary |

```csharp
// Program.cs
app.MapPost("/api/pdf/generate", async (PdfGenerateRequest req, PdfGenerationService pdfService) =>
{
    if (string.IsNullOrWhiteSpace(req.Html))
        return Results.BadRequest(new { error = "No HTML provided." });

    var bytes = await pdfService.GenerateAsync(req.Html);
    return Results.File(bytes, "application/pdf", req.Filename ?? "resume.pdf");
});

record PdfGenerateRequest(string Html, string? Filename);
```

### Service Registration

`PdfGenerationService` is registered as both `IHostedService` and a singleton so Chromium begins downloading at startup in the background, not on the first request.

```csharp
// Program.cs
builder.Services.AddSingleton<PdfGenerationService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<PdfGenerationService>());
```

### Chromium Startup

```csharp
// PdfGenerationService.cs — StartAsync (IHostedService)
public Task StartAsync(CancellationToken cancellationToken)
{
    // Docker: use pre-installed system Chromium (PUPPETEER_EXECUTABLE_PATH env var)
    var envPath = Environment.GetEnvironmentVariable("PUPPETEER_EXECUTABLE_PATH");
    if (!string.IsNullOrEmpty(envPath))
    {
        _executablePath = envPath;
        _warmupTask = Task.CompletedTask;
        return Task.CompletedTask;
    }

    // Local / non-Docker: download Chromium to ~/.puppeteer-cache on first run
    _warmupTask = Task.Run(async () =>
    {
        await _initLock.WaitAsync(cancellationToken);
        try {
            var fetcher = new BrowserFetcher(new BrowserFetcherOptions { Path = ChromiumCacheDir });
            var installed = await fetcher.DownloadAsync();
            _executablePath = installed.GetExecutablePath();
        }
        finally { _initLock.Release(); }
    }, cancellationToken);
    return Task.CompletedTask;
}
```

### PDF Generation

```csharp
// PdfGenerationService.cs — GenerateAsync
public async Task<byte[]> GenerateAsync(string html)
{
    if (_warmupTask is not null) await _warmupTask;  // ensure Chromium is ready

    using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
    {
        Headless        = true,
        ExecutablePath  = _executablePath,
        Args            = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    using var page = await browser.NewPageAsync();

    // Load HTML and wait for all network activity to settle (web fonts, etc.)
    await page.SetContentAsync(html, new NavigationOptions {
        WaitUntil = [WaitUntilNavigation.Networkidle0],
    });

    // Wait for custom fonts to finish rendering (avoids fallback font in PDF)
    await page.EvaluateExpressionAsync("document.fonts?.ready ?? Promise.resolve()");

    return await page.PdfDataAsync(new PdfOptions
    {
        Format           = PaperFormat.A4,
        PreferCSSPageSize = true,       // honours @page CSS size declarations
        PrintBackground  = true,        // preserve background colours / images
        MarginOptions    = new MarginOptions { Top = "0", Bottom = "0", Left = "0", Right = "0" },
    });
}
```

### Key Design Decisions

| Decision | Reason |
|---|---|
| `Networkidle0` wait | Ensures web fonts loaded from CDN are embedded before PDF capture |
| `document.fonts.ready` eval | Guarantees custom fonts render correctly, not fallbacks |
| `PreferCSSPageSize = true` | Layout components control page dimensions via `@page { size: A4 }` |
| `PrintBackground = true` | Sidebar colors, section backgrounds, accent bars are preserved |
| Zero margins | Layouts use internal padding; external margins would cause double-spacing |
| `--no-sandbox` | Required for containerised (Docker) environments where setuid is unavailable |
| Singleton + IHostedService | Chromium download happens once at app start, not on the hot path |

---

## Architecture: Static File Serving

The same `SmartCV.API` project also serves the static Next.js export from `wwwroot/`.  
Cache headers are set in `Program.cs`:

```csharp
// Program.cs — static files cache strategy
app.UseStaticFiles(new StaticFileOptions {
    OnPrepareResponse = context => {
        var path = context.Context.Request.Path.Value ?? "";
        // Hashed _next/ assets: immutable 1-year cache
        if (path.StartsWith("/_next/"))
            headers.CacheControl = "public,max-age=31536000,immutable";
        // HTML entry points: no cache (for seamless redeployment)
        if (path.EndsWith("/index.html"))
            headers.CacheControl = "no-store,no-cache,must-revalidate,max-age=0";
    }
});
```
