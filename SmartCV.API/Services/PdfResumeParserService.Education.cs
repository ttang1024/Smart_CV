using System.Text.RegularExpressions;
using SmartCV.API.Models;

namespace SmartCV.API.Services;

public partial class PdfResumeParserService
{
    // ── Education ─────────────────────────────────────────────────────────────

    private static List<EducationModel> ParseEducationSection(List<string> lines)
    {
        var results = new List<EducationModel>();
        var entries = GroupEducationEntries(lines);

        foreach (var entry in entries)
        {
            if (entry.Count == 0) continue;
            var edu = new EducationModel();

            var dateLineIdx = entry.FindIndex(l => DateRangeRx().IsMatch(l) && !BulletRx().IsMatch(l));
            if (dateLineIdx < 0)
                dateLineIdx = entry.FindIndex(l => DateRx().IsMatch(l) && !BulletRx().IsMatch(l));

            string? eduDateLineNonDateText = null;
            if (dateLineIdx >= 0)
            {
                var dateLine = entry[dateLineIdx];
                var rangeMatch = DateRangeRx().Match(dateLine);
                if (rangeMatch.Success)
                {
                    edu.StartDate = NormalizeDate(rangeMatch.Groups[1].Value);
                    if (IsPresent(rangeMatch.Groups[2].Value))
                        edu.Current = true;
                    else
                        edu.EndDate = NormalizeDate(rangeMatch.Groups[2].Value);
                }
                else
                {
                    var dm = DateRx().Match(dateLine);
                    if (dm.Success) edu.StartDate = NormalizeDate(dm.Value);
                }

                // Text on the date line that is NOT the date (e.g. "Degree  Institution (Expected 2026)")
                eduDateLineNonDateText = DateRangeRx().Replace(DateRx().Replace(dateLine, ""), "")
                    .Trim().Trim('-', '–', '·', '•', '(', ')', ' ');
            }

            var headerLines = dateLineIdx >= 0
                ? entry.Take(dateLineIdx).Where(l => !BulletRx().IsMatch(l)).ToList()
                : entry.Where(l => !BulletRx().IsMatch(l)).ToList();

            // When the date is on the very first line (two-column PDF layout), the degree and
            // institution are embedded in that same line — promote non-date text to headerLines.
            if (headerLines.Count == 0 && !string.IsNullOrWhiteSpace(eduDateLineNonDateText))
                headerLines = [eduDateLineNonDateText];

            // First header line is typically the institution (or "Degree  Institution" combined)
            if (headerLines.Count > 0)
            {
                var firstLine = headerLines[0].Trim();

                // Try to split "Degree  Institution" when they appear on one line.
                // Strategy: find an institution keyword (University/College/etc.) and split there.
                var instKwMatch = InstitutionKeywordRx().Match(firstLine);
                var degreeInLine = DegreeRx().Match(firstLine);

                if (degreeInLine.Success && instKwMatch.Success && instKwMatch.Index > degreeInLine.Index)
                {
                    // Degree part is before the institution keyword.
                    // Look one word back: if the word immediately before the institution keyword
                    // is a proper noun not already captured by degree/field, include it in the name.
                    var preInst = firstLine[..instKwMatch.Index];
                    var wordBeforeKw = Regex.Match(preInst, @"([A-Z][a-z]\w*)\s*$");
                    var wordBeforeKwText = wordBeforeKw.Groups[1].Value; // capture group only, no trailing space
                    int institutionStart = (wordBeforeKw.Success
                        && !DegreeRx().IsMatch(wordBeforeKwText)
                        && !AcademicFieldWords.Contains(wordBeforeKwText))
                        ? wordBeforeKw.Index
                        : instKwMatch.Index;

                    var degreePart = firstLine[..institutionStart].Trim().TrimEnd(',', '-', ' ');
                    var rawInstitution = firstLine[institutionStart..].Trim();
                    // Remove any leftover parenthetical without a closing paren (e.g. "(Expected")
                    edu.Institution = Regex.Replace(rawInstitution, @"\s*\([^)]*$", "").Trim();

                    var degPart2 = DegreeRx().Match(degreePart);
                    if (degPart2.Success)
                    {
                        edu.Degree = degPart2.Value.Trim();
                        var afterDeg = degreePart[(degPart2.Index + degPart2.Length)..].Trim().TrimStart('o', 'f', ' ', ',');
                        if (afterDeg.Length > 2) edu.Field = afterDeg.Trim();
                    }
                }
                else
                {
                    // No degree keyword found before institution keyword — just store the full line
                    edu.Institution = Regex.Replace(firstLine, @"\s*\([^)]*$", "").Trim();
                }
            }

            // Remaining header lines may contain degree + field
            foreach (var line in headerLines.Skip(1))
            {
                var degreeMatch = DegreeRx().Match(line);
                if (degreeMatch.Success)
                {
                    edu.Degree = degreeMatch.Value.Trim();
                    // Field of study = text after "in" or after the degree keyword
                    var afterDegree = line[(degreeMatch.Index + degreeMatch.Length)..].Trim().TrimStart('i', 'n', ' ', ',');
                    if (afterDegree.Length > 2) edu.Field = afterDegree.Trim();
                }
                else if (string.IsNullOrEmpty(edu.Field))
                {
                    edu.Field = line.Trim();
                }
            }

            // Look for GPA in all lines
            foreach (var line in entry)
            {
                var gpaMatch = GpaRx().Match(line);
                if (gpaMatch.Success && string.IsNullOrEmpty(edu.Gpa))
                    edu.Gpa = $"{gpaMatch.Groups[1].Value}/{gpaMatch.Groups[2].Value}";

                var honorsMatch = HonorsRx().Match(line);
                if (honorsMatch.Success && string.IsNullOrEmpty(edu.Honors))
                    edu.Honors = honorsMatch.Value.Trim();
            }

            if (!string.IsNullOrWhiteSpace(edu.Institution))
                results.Add(edu);
        }

        return results;
    }
}
