using System.Text.RegularExpressions;
using SmartCV.API.Models;

namespace SmartCV.API.Services;

public partial class PdfResumeParserService
{
    // ── Experience ────────────────────────────────────────────────────────────

    private static List<ExperienceModel> ParseExperienceSection(List<string> lines)
    {
        var results = new List<ExperienceModel>();
        var entries = GroupIntoEntries(lines);

        foreach (var entry in entries)
        {
            if (entry.Count == 0) continue;
            var exp = new ExperienceModel();

            // Find first line containing a date range
            var dateLineIdx = entry.FindIndex(l => DateRangeRx().IsMatch(l) && !BulletRx().IsMatch(l));
            // Also accept a single date (no range) if no range found
            if (dateLineIdx < 0)
                dateLineIdx = entry.FindIndex(l => DateRx().IsMatch(l) && !BulletRx().IsMatch(l));

            string? dateLineNonDateText = null;
            if (dateLineIdx >= 0)
            {
                var dateLine = entry[dateLineIdx];
                var rangeMatch = DateRangeRx().Match(dateLine);
                if (rangeMatch.Success)
                {
                    exp.StartDate = NormalizeDate(rangeMatch.Groups[1].Value);
                    if (IsPresent(rangeMatch.Groups[2].Value))
                        exp.Current = true;
                    else
                        exp.EndDate = NormalizeDate(rangeMatch.Groups[2].Value);
                }
                else
                {
                    var dm = DateRx().Match(dateLine);
                    if (dm.Success) exp.StartDate = NormalizeDate(dm.Value);
                }

                // Text on the date line that is NOT the date itself (may hold company + location
                // when the PDF lays company name and date on the same visual row).
                dateLineNonDateText = DateRangeRx().Replace(DateRx().Replace(dateLine, ""), "")
                    .Trim().Trim('-', '–', '·', '•', ' ');

                // Only treat leftover text as a plain location when it has no pipe separator
                // (a pipe indicates "Company | Location", handled below).
                var locationOnly = dateLineNonDateText.Trim('|', ',', ' ');
                if (!string.IsNullOrWhiteSpace(locationOnly)
                    && locationOnly.Length < 50
                    && !locationOnly.Contains('|'))
                    exp.Location = locationOnly;
            }

            // Lines before the date line → company + position
            var headerLines = dateLineIdx >= 0
                ? entry.Take(dateLineIdx).Where(l => !BulletRx().IsMatch(l)).ToList()
                : entry.Take(1).ToList();

            // When the date is on the very first line (dateLineIdx == 0), the company/position
            // are embedded in that same line — extract them from the non-date portion.
            if (headerLines.Count == 0 && !string.IsNullOrWhiteSpace(dateLineNonDateText))
                AssignCompanyAndPosition([dateLineNonDateText], exp);
            else
                AssignCompanyAndPosition(headerLines, exp);

            // Lines after date line → description / bullets
            var bodyLines = dateLineIdx >= 0
                ? entry.Skip(dateLineIdx + 1).ToList()
                : entry.Skip(headerLines.Count).ToList();

            ParseDescriptionAndHighlights(bodyLines, exp);

            if (!string.IsNullOrWhiteSpace(exp.Company) || !string.IsNullOrWhiteSpace(exp.Position))
                results.Add(exp);
        }

        return results;
    }

    private static void AssignCompanyAndPosition(List<string> headerLines, ExperienceModel exp)
    {
        if (headerLines.Count == 0) return;

        // If a line contains a separator (|, @), split it
        foreach (var line in headerLines)
        {
            var parts = Regex.Split(line, @"\s*[|@]\s*").Select(p => p.Trim()).Where(p => p.Length > 0).ToArray();
            if (parts.Length >= 2)
            {
                // If parts[1] looks like a location (e.g. "City, Country") rather than a
                // company name, interpret the format as "Company | Location" rather than
                // the classic "Position | Company".
                if (parts[1].Contains(',') && !parts[0].Contains(','))
                {
                    exp.Company = parts[0];
                    if (string.IsNullOrEmpty(exp.Location))
                        exp.Location = parts[1];
                }
                else
                {
                    exp.Position = parts[0];
                    exp.Company = parts[1];
                    if (parts.Length > 2 && string.IsNullOrEmpty(exp.Location))
                        exp.Location = parts[2];
                }
                return;
            }
        }

        // Otherwise first non-empty line = position, second = company
        if (headerLines.Count >= 1) exp.Position = headerLines[0].Trim();
        if (headerLines.Count >= 2) exp.Company = headerLines[1].Trim();
    }

    private static void ParseDescriptionAndHighlights(List<string> bodyLines, ExperienceModel exp)
    {
        var paragraphs = new List<string>();

        foreach (var line in bodyLines)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            if (BulletRx().IsMatch(line))
                exp.Highlights.Add(BulletRx().Replace(line, "").Trim());
            else
                paragraphs.Add(line.Trim());
        }

        if (paragraphs.Count > 0)
            exp.Description = string.Join(" ", paragraphs);
    }
}
