using UglyToad.PdfPig;

namespace SmartCV.API.Services;

public partial class PdfResumeParserService
{
    // ── Text extraction ───────────────────────────────────────────────────────

    private static List<string> ExtractLines(Stream pdfStream)
    {
        var allLines = new List<string>();

        using var document = PdfDocument.Open(pdfStream);
        foreach (var page in document.GetPages())
        {
            // Group words by rounded Y coordinate (bottom of bounding box)
            var byY = new SortedDictionary<int, List<(double X, double Right, string Text)>>(
                Comparer<int>.Create((a, b) => b.CompareTo(a))); // descending = top first

            foreach (var word in page.GetWords())
            {
                var y = (int)Math.Round(word.BoundingBox.Bottom);
                if (!byY.TryGetValue(y, out var bucket))
                {
                    bucket = [];
                    byY[y] = bucket;
                }
                bucket.Add((word.BoundingBox.Left, word.BoundingBox.Right, word.Text));
            }

            foreach (var (_, words) in byY)
            {
                var ordered = words.OrderBy(w => w.X).ToList();
                var sb = new System.Text.StringBuilder();
                double prevRight = double.MinValue;

                foreach (var (x, right, text) in ordered)
                {
                    if (prevRight > double.MinValue)
                    {
                        // A gap > 8pt between word bounding boxes indicates a column separator
                        // (CSS 16px column-gap ≈ 12pt; normal inter-word spacing ≈ 2–3pt)
                        sb.Append(x - prevRight > 8.0 ? '\t' : ' ');
                    }
                    sb.Append(text);
                    prevRight = right;
                }

                var line = sb.ToString().Trim();
                if (!string.IsNullOrWhiteSpace(line))
                    allLines.Add(line);
            }

            // Blank line between pages acts as a natural separator
            allLines.Add("");
        }

        return allLines;
    }

    // ── Section splitting ─────────────────────────────────────────────────────

    private static Dictionary<SectionType, List<string>> SplitIntoSections(List<string> lines)
    {
        var result = new Dictionary<SectionType, List<string>>();
        foreach (SectionType st in Enum.GetValues<SectionType>())
            result[st] = [];

        var current = SectionType.Header;

        foreach (var line in lines)
        {
            var detected = DetectSectionHeader(line);
            if (detected != null)
            {
                current = detected.Value;
                continue; // Skip the header line itself
            }
            result[current].Add(line);
        }

        return result;
    }

    private static SectionType? DetectSectionHeader(string line)
    {
        var trimmed = line.Trim().TrimEnd(':', '：').Trim();
        // Strip common CJK decoration brackets (e.g. 【工作经历】, 《技能》)
        trimmed = trimmed.Trim('【', '】', '《', '》', '〈', '〉', '「', '」', '〔', '〕').Trim();

        // Section headers are short; allow 2 chars minimum for CJK (e.g. 技能, 语言)
        if (trimmed.Length > 60 || trimmed.Length < 2) return null;
        // Skip separator / decorative lines
        if (trimmed.All(c => c is '-' or '=' or '_' or '*' or '─' or '━' or '▬')) return null;
        // Skip lines that look like bullet points
        if (BulletRx().IsMatch(trimmed)) return null;

        var lower = trimmed.ToLowerInvariant();

        foreach (var (sectionType, keywords) in SectionKeywords)
        {
            foreach (var kw in keywords)
            {
                // CJK keywords: match if line equals or starts with the keyword
                // (Chinese section headers have no spaces so StartsWith covers decorated variants)
                if (kw.Any(c => c >= '一'))
                {
                    if (lower == kw || lower.StartsWith(kw))
                        return sectionType;
                }
                else
                {
                    if (lower == kw || lower == kw + "s" || lower.StartsWith(kw + " ") || lower.StartsWith(kw + "/"))
                        return sectionType;
                }
            }
        }

        return null;
    }

    // ── Helpers: grouping entries ─────────────────────────────────────────────

    /// <summary>Splits education section lines into per-entry groups using blank lines
    /// OR a new degree keyword at the start of a line as separators.</summary>
    private static List<List<string>> GroupEducationEntries(List<string> lines)
    {
        var entries = new List<List<string>>();
        var current = new List<string>();

        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                if (current.Count > 0) { entries.Add(current); current = []; }
                continue;
            }

            // A new degree keyword near the start of a line (and current already has content)
            // signals the start of a new education entry.
            if (current.Count > 0 && !BulletRx().IsMatch(line))
            {
                var deg = DegreeRx().Match(line);
                if (deg.Success && deg.Index < 20)
                {
                    entries.Add(current);
                    current = [];
                }
            }

            current.Add(line);
        }
        if (current.Count > 0) entries.Add(current);
        return entries;
    }

    /// <summary>Splits a flat list of section lines into per-entry groups,
    /// using lines that contain date ranges as entry delimiters.</summary>
    private static List<List<string>> GroupIntoEntries(List<string> lines)
    {
        var entries = new List<List<string>>();
        var current = new List<string>();

        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                if (current.Count > 0) { entries.Add(current); current = []; }
                continue;
            }

            // A line with a date range that also looks like a header row starts a new entry.
            // Exception: if current has exactly one non-date line, it's likely the company/
            // position header for *this* date line (e.g. PDF with right-aligned date on the
            // same visual row), so keep it in the same entry instead of splitting.
            if (DateRangeRx().IsMatch(line) && !BulletRx().IsMatch(line) && current.Count > 0)
            {
                bool currentIsJustHeader = current.Count == 1
                    && !DateRangeRx().IsMatch(current[0])
                    && !DateRx().IsMatch(current[0]);

                if (!currentIsJustHeader)
                {
                    entries.Add(current);
                    current = [];
                }
            }

            current.Add(line);
        }
        if (current.Count > 0) entries.Add(current);
        return entries;
    }
}
