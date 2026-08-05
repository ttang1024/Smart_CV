using System.Text.RegularExpressions;

namespace SmartCV.API.Services;

public partial class PdfResumeParserService
{
    // ── Date helpers ──────────────────────────────────────────────────────────

    private static readonly Dictionary<string, string> MonthMap = new(StringComparer.OrdinalIgnoreCase)
    {
        // English
        ["jan"] = "01", ["january"] = "01",
        ["feb"] = "02", ["february"] = "02",
        ["mar"] = "03", ["march"] = "03",
        ["apr"] = "04", ["april"] = "04",
        ["may"] = "05",
        ["jun"] = "06", ["june"] = "06",
        ["jul"] = "07", ["july"] = "07",
        ["aug"] = "08", ["august"] = "08",
        ["sep"] = "09", ["sept"] = "09", ["september"] = "09",
        ["oct"] = "10", ["october"] = "10",
        ["nov"] = "11", ["november"] = "11",
        ["dec"] = "12", ["december"] = "12",
        // Spanish
        ["ene"] = "01", ["enero"] = "01",
        ["febrero"] = "02",
        ["marzo"] = "03",
        ["abr"] = "04", ["abril"] = "04",
        ["mayo"] = "05",
        ["junio"] = "06",
        ["julio"] = "07",
        ["ago"] = "08", ["agosto"] = "08",
        ["septiembre"] = "09",
        ["octubre"] = "10",
        ["noviembre"] = "11",
        ["dic"] = "12", ["diciembre"] = "12",
    };

    private static string NormalizeDate(string raw)
    {
        raw = raw.Trim().TrimEnd('.');
        // Already in YYYY-MM
        if (Regex.IsMatch(raw, @"^\d{4}-\d{2}$")) return raw;
        // "MM/YYYY"
        var mmyyyy = Regex.Match(raw, @"^(\d{1,2})/(\d{4})$");
        if (mmyyyy.Success) return $"{mmyyyy.Groups[2].Value}-{mmyyyy.Groups[1].Value.PadLeft(2, '0')}";
        // "Month YYYY"
        var moy = Regex.Match(raw, @"^([A-Za-z]+)\.?\s+(\d{4})$");
        if (moy.Success)
        {
            var monthKey = moy.Groups[1].Value.ToLowerInvariant().TrimEnd('.');
            var mm = MonthMap.GetValueOrDefault(monthKey, "01");
            return $"{moy.Groups[2].Value}-{mm}";
        }
        // Chinese "YYYY年MM月" or "YYYY年"
        var zhDate = Regex.Match(raw, @"^(\d{4})年(?:(\d{1,2})月)?$");
        if (zhDate.Success)
        {
            var year = zhDate.Groups[1].Value;
            var month = zhDate.Groups[2].Success ? zhDate.Groups[2].Value.PadLeft(2, '0') : "01";
            return $"{year}-{month}";
        }
        // Plain year
        if (Regex.IsMatch(raw, @"^\d{4}$")) return $"{raw}-01";
        return raw;
    }

    private static bool IsPresent(string raw)
    {
        var t = raw.Trim();
        return t.Equals("present", StringComparison.OrdinalIgnoreCase)
            || t.Equals("current", StringComparison.OrdinalIgnoreCase)
            || t.Equals("now", StringComparison.OrdinalIgnoreCase)
            // Spanish
            || t.Equals("actualidad", StringComparison.OrdinalIgnoreCase)
            || t.Equals("actual", StringComparison.OrdinalIgnoreCase)
            || t.Equals("presente", StringComparison.OrdinalIgnoreCase)
            || t.Equals("actualmente", StringComparison.OrdinalIgnoreCase)
            // Simplified Chinese
            || t == "至今" || t == "现在" || t == "目前"
            // Traditional Chinese
            || t == "現在";
    }
}
