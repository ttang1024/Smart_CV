using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace SmartCV.API.Services;

public class PdfGenerationService
{
    private static bool _chromiumReady = false;
    private static readonly SemaphoreSlim _initLock = new(1, 1);

    private static async Task EnsureChromiumAsync()
    {
        if (_chromiumReady) return;
        await _initLock.WaitAsync();
        try
        {
            if (!_chromiumReady)
            {
                await new BrowserFetcher().DownloadAsync();
                _chromiumReady = true;
            }
        }
        finally
        {
            _initLock.Release();
        }
    }

    public async Task<byte[]> GenerateAsync(string html)
    {
        await EnsureChromiumAsync();

        using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
        {
            Headless = true,
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
            MarginOptions = new MarginOptions { Top = "14mm", Bottom = "14mm", Left = "0", Right = "0" },
        });
    }
}
