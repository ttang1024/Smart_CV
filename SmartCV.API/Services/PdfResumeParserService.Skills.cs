using SmartCV.API.Models;

namespace SmartCV.API.Services;

public partial class PdfResumeParserService
{
    // ── Skills ────────────────────────────────────────────────────────────────

    // Separators used between individual skill items
    private static readonly char[] SkillSeparators = [',', ';', '|', '·', '•', '/'];

    private static List<string> SplitSkillItems(string text) =>
        text.Split(SkillSeparators, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim()).Where(s => s.Length > 0).ToList();

    private static List<SkillModel> ParseSkillsSection(List<string> lines)
    {
        var results = new List<SkillModel>();
        string? pendingCategory = null;

        foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l)))
        {
            var clean = BulletRx().Replace(line, "").Trim();

            // "Category: item1, item2 …" — colon-delimited category up to 60 chars
            var colonIdx = clean.IndexOf(':');
            if (colonIdx > 0 && colonIdx < 60)
            {
                var category = clean[..colonIdx].Trim();
                var afterColon = clean[(colonIdx + 1)..].Trim();

                if (!string.IsNullOrWhiteSpace(afterColon))
                {
                    var items = SplitSkillItems(afterColon);
                    if (items.Count > 0)
                    {
                        results.Add(new SkillModel { Category = category, Items = items });
                        pendingCategory = null;
                        continue;
                    }
                }
                else
                {
                    // "Category:" with no items on this line — items follow on the next line(s)
                    pendingCategory = category;
                    continue;
                }
            }

            // If we have a pending category, treat this line as its items
            if (pendingCategory is not null)
            {
                var items = SplitSkillItems(clean);
                if (items.Count > 0)
                {
                    results.Add(new SkillModel { Category = pendingCategory, Items = items });
                    pendingCategory = null;
                    continue;
                }
                pendingCategory = null;
            }

            // Comma/pipe/bullet-separated list — two or more items → General
            var allItems = SplitSkillItems(clean);
            if (allItems.Count >= 2)
            {
                results.Add(new SkillModel { Category = "General", Items = allItems });
            }
            else if (allItems.Count == 1)
            {
                // Single token — could be a skill name or a category header.
                // Merge into the most recent non-General group when it looks like a skill
                // (short, no sentence structure); otherwise treat as a standalone General item.
                var token = allItems[0];
                var lastNamed = results.LastOrDefault(r => r.Category != "General");
                if (lastNamed is not null && token.Length < 40
                    && !token.EndsWith('.') && !char.IsLower(token[0]))
                {
                    lastNamed.Items.Add(token);
                }
                else
                {
                    var last = results.LastOrDefault(r => r.Category == "General");
                    if (last is not null) last.Items.Add(token);
                    else results.Add(new SkillModel { Category = "General", Items = [token] });
                }
            }
        }

        // Deduplicate General categories into one
        var generalItems = results.Where(r => r.Category == "General").SelectMany(r => r.Items).Distinct().ToList();
        results.RemoveAll(r => r.Category == "General");
        if (generalItems.Count > 0)
            results.Add(new SkillModel { Category = "General", Items = generalItems });

        return results;
    }
}
