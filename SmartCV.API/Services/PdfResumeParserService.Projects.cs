using System.Text.RegularExpressions;
using SmartCV.API.Models;

namespace SmartCV.API.Services;

public partial class PdfResumeParserService
{
    // ── Projects ──────────────────────────────────────────────────────────────

    // Returns true when a line looks like a project name header rather than description text:
    // short, starts with a capital, and does not end with a sentence-terminator.
    private static bool LooksLikeProjectName(string text) =>
        text.Length > 0
        && text.Length <= 80
        && char.IsUpper(text[0])
        && !text.EndsWith('.')
        && !text.EndsWith(',');

    private static List<ProjectModel> ParseProjectsSection(List<string> lines)
    {
        var results = new List<ProjectModel>();
        var entries = GroupIntoEntries(lines);

        foreach (var entry in entries)
        {
            if (entry.Count == 0) continue;
            var project = new ProjectModel();
            var descParts = new List<string>();

            foreach (var line in entry)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                var clean = BulletRx().Replace(line, "").Trim();

                // Technologies
                var techMatch = Regex.Match(clean, @"(?:technologies?|tech(?:\s*stack)?|built\s*with|tools?)\s*[:\-]\s*(.+)", RegexOptions.IgnoreCase);
                if (techMatch.Success)
                {
                    project.Technologies = techMatch.Groups[1].Value
                        .Split([',', ';', '|'], StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                    continue;
                }

                // URL
                var urlMatch = UrlRx().Match(clean);
                if (urlMatch.Success)
                {
                    if (GitHubRx().IsMatch(clean) && project.GitHub is null)
                        project.GitHub = urlMatch.Value;
                    else if (project.Url is null)
                        project.Url = urlMatch.Value;
                    continue;
                }

                if (string.IsNullOrEmpty(project.Name) && !BulletRx().IsMatch(line))
                {
                    // First non-bullet, non-url, non-tech line = project name
                    project.Name = clean;
                }
                else if (!string.IsNullOrEmpty(project.Name) && !BulletRx().IsMatch(line) && LooksLikeProjectName(clean))
                {
                    // Another heading-like line while the current project already has a name:
                    // blank lines were lost during PDF extraction — save the current project and start a new one.
                    project.Description = string.Join(" ", descParts).Trim();
                    if (!string.IsNullOrWhiteSpace(project.Name))
                        results.Add(project);
                    project = new ProjectModel { Name = clean };
                    descParts = [];
                }
                else
                {
                    descParts.Add(clean);
                }
            }

            project.Description = string.Join(" ", descParts).Trim();

            if (!string.IsNullOrWhiteSpace(project.Name))
                results.Add(project);
        }

        return results;
    }
}
