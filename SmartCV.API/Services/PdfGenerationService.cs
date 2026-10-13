using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace SmartCV.API.Services;

public interface IPdfGenerationService
{
    Task<byte[]> GenerateAsync(string html, CancellationToken ct = default);
}

/// <summary>Raised when a render can't be performed; carries the HTTP status to return.</summary>
public sealed class PdfGenerationException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

/// <summary>
/// Renders resume HTML to PDF with a long-lived headless Chromium.
///
/// The HTML comes from an anonymous client, so every page is locked down: JavaScript is
/// disabled, every network request other than inline <c>data:</c> URLs is aborted (no
/// SSRF into the host network or cloud metadata endpoints), renders are time-boxed, and
/// only a few run at once so a burst of requests can't exhaust memory.
/// </summary>
public class PdfGenerationService(IConfiguration configuration, ILogger<PdfGenerationService> logger)
    : IPdfGenerationService, IHostedService, IAsyncDisposable
{
    private static readonly TimeSpan RenderTimeout = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan QueueTimeout = TimeSpan.FromSeconds(15);

    private readonly SemaphoreSlim _browserLock = new(1, 1);
    private readonly SemaphoreSlim _renderSlots = new(
        configuration.GetValue("PdfRendering:MaxConcurrentRenders", 2),
        configuration.GetValue("PdfRendering:MaxConcurrentRenders", 2));
    private Task? _warmupTask;
    private string? _executablePath;
    private IBrowser? _browser;

    // Store downloaded Chromium outside wwwroot for non-container local or hosted runs.
    private static readonly string ChromiumCacheDir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".puppeteer-cache");

    public Task StartAsync(CancellationToken cancellationToken)
    {
        // In Docker the system Chromium is pre-installed; skip the network download.
        var envPath = Environment.GetEnvironmentVariable("PUPPETEER_EXECUTABLE_PATH");

        // Resolve the executable and launch the browser once at startup so the first
        // request doesn't pay the download + process-launch cost.
        _warmupTask = Task.Run(async () =>
        {
            if (!string.IsNullOrEmpty(envPath))
            {
                _executablePath = envPath;
            }
            else
            {
                var fetcher = new BrowserFetcher(new BrowserFetcherOptions { Path = ChromiumCacheDir });
                var installed = await fetcher.DownloadAsync();
                _executablePath = installed.GetExecutablePath();
            }

            await EnsureBrowserAsync(CancellationToken.None);
        }, cancellationToken);

        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_browser is not null)
        {
            await _browser.CloseAsync();
            await _browser.DisposeAsync();
            _browser = null;
        }
    }

    public async Task<byte[]> GenerateAsync(string html, CancellationToken ct = default)
    {
        if (_warmupTask is not null) await _warmupTask.WaitAsync(ct);

        if (!await _renderSlots.WaitAsync(QueueTimeout, ct))
            throw new PdfGenerationException(StatusCodes.Status503ServiceUnavailable, "The PDF renderer is busy. Please try again.");

        try
        {
            var browser = await EnsureBrowserAsync(ct);

            // Reuse the long-lived browser; only the page is per-request.
            await using var page = await browser.NewPageAsync();
            await LockDownAsync(page);

            try
            {
                return await RenderAsync(page, html).WaitAsync(RenderTimeout, ct);
            }
            catch (TimeoutException)
            {
                logger.LogWarning("PDF render exceeded {Timeout}s", RenderTimeout.TotalSeconds);
                throw new PdfGenerationException(StatusCodes.Status504GatewayTimeout, "PDF rendering timed out.");
            }
        }
        finally
        {
            _renderSlots.Release();
        }
    }

    private static async Task LockDownAsync(IPage page)
    {
        await page.SetJavaScriptEnabledAsync(false);
        await page.SetRequestInterceptionAsync(true);
        page.Request += async (_, e) =>
        {
            var url = e.Request.Url;
            if (url.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ||
                url.Equals("about:blank", StringComparison.OrdinalIgnoreCase))
            {
                await e.Request.ContinueAsync();
            }
            else
            {
                await e.Request.AbortAsync();
            }
        };
    }

    private static async Task<byte[]> RenderAsync(IPage page, string html)
    {
        await page.SetContentAsync(html, new NavigationOptions
        {
            WaitUntil = [WaitUntilNavigation.Load],
            Timeout = (int)RenderTimeout.TotalMilliseconds,
        });
        await page.EvaluateExpressionAsync("document.fonts?.ready ?? Promise.resolve()");

        return await page.PdfDataAsync(new PdfOptions
        {
            Format = PaperFormat.A4,
            PreferCSSPageSize = true,
            PrintBackground = true,
            MarginOptions = new MarginOptions { Top = "0", Bottom = "0", Left = "0", Right = "0" },
        });
    }

    // Returns a connected browser, (re)launching it if it was never started or has
    // since crashed/disconnected. The lock serialises only the launch, not generation.
    private async Task<IBrowser> EnsureBrowserAsync(CancellationToken ct)
    {
        if (_browser is { IsConnected: true } connected) return connected;

        await _browserLock.WaitAsync(ct);
        try
        {
            if (_browser is { IsConnected: true } existing) return existing;

            if (_browser is not null)
            {
                await _browser.DisposeAsync();
                _browser = null;
            }

            _browser = await Puppeteer.LaunchAsync(new LaunchOptions
            {
                Headless = true,
                ExecutablePath = _executablePath,
                Args = LaunchArgs(),
            });
            return _browser;
        }
        finally { _browserLock.Release(); }
    }

    // Chromium's sandbox needs user namespaces, which most container runtimes (App Runner
    // included) don't grant, so the container opts out via PdfRendering__DisableSandbox.
    // Local runs keep the sandbox. The page lock-down above is what makes that acceptable.
    private string[] LaunchArgs() => configuration.GetValue("PdfRendering:DisableSandbox", false)
        ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        : ["--disable-dev-shm-usage"];

    public async ValueTask DisposeAsync()
    {
        await StopAsync(CancellationToken.None);
        _browserLock.Dispose();
        _renderSlots.Dispose();
        GC.SuppressFinalize(this);
    }
}
