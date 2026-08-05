using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace SmartCV.API.Services;

public interface IPdfGenerationService
{
    Task<byte[]> GenerateAsync(string html);
}

public class PdfGenerationService : IPdfGenerationService, IHostedService, IAsyncDisposable
{
    private static readonly string[] LaunchArgs =
        ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];

    private readonly SemaphoreSlim _browserLock = new(1, 1);
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

    public async Task<byte[]> GenerateAsync(string html)
    {
        if (_warmupTask is not null) await _warmupTask;

        var browser = await EnsureBrowserAsync(CancellationToken.None);

        // Reuse the long-lived browser; only the page is per-request.
        await using var page = await browser.NewPageAsync();
        await page.SetContentAsync(html, new NavigationOptions
        {
            WaitUntil = [WaitUntilNavigation.Networkidle0],
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
                Args = LaunchArgs,
            });
            return _browser;
        }
        finally { _browserLock.Release(); }
    }

    public async ValueTask DisposeAsync()
    {
        await StopAsync(CancellationToken.None);
        _browserLock.Dispose();
    }
}
