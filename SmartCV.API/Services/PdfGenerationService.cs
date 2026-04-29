using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace SmartCV.API.Services;

public class PdfGenerationService : IHostedService
{
    private static readonly SemaphoreSlim _initLock = new(1, 1);
    private static Task? _warmupTask;
    private static string? _executablePath;

    // Store downloaded Chromium outside wwwroot for non-container local or hosted runs.
    private static readonly string ChromiumCacheDir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".puppeteer-cache");

    public Task StartAsync(CancellationToken cancellationToken)
    {
        // In Docker the system Chromium is pre-installed; skip the network download.
        var envPath = Environment.GetEnvironmentVariable("PUPPETEER_EXECUTABLE_PATH");
        if (!string.IsNullOrEmpty(envPath))
        {
            _executablePath = envPath;
            _warmupTask = Task.CompletedTask;
            return Task.CompletedTask;
        }

        _warmupTask = Task.Run(async () =>
        {
            await _initLock.WaitAsync(cancellationToken);
            try
            {
                var fetcher = new BrowserFetcher(new BrowserFetcherOptions { Path = ChromiumCacheDir });
                var installed = await fetcher.DownloadAsync();
                _executablePath = installed.GetExecutablePath();
            }
            finally { _initLock.Release(); }
        }, cancellationToken);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public async Task<byte[]> GenerateAsync(string html)
    {
        if (_warmupTask is not null) await _warmupTask;

        using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
        {
            Headless = true,
            ExecutablePath = _executablePath,
            Args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });

        using var page = await browser.NewPageAsync();
        await page.SetContentAsync(html, new NavigationOptions
        {
            WaitUntil = [WaitUntilNavigation.Networkidle0],
        });

        return await page.PdfDataAsync(new PdfOptions
        {
            Format = PaperFormat.A4,
            PrintBackground = true,
            MarginOptions = new MarginOptions { Top = "0", Bottom = "0", Left = "0", Right = "0" },
        });
    }
}
