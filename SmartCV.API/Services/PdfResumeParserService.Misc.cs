using System.Text.RegularExpressions;
using SmartCV.API.Models;

namespace SmartCV.API.Services;

public partial class PdfResumeParserService
{
    // ── Certifications ────────────────────────────────────────────────────────

    private static List<CertificationModel> ParseCertificationsSection(List<string> lines)
    {
        var results = new List<CertificationModel>();

        foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l)))
        {
            var clean = BulletRx().Replace(line, "").Trim();

            var cert = new CertificationModel();

            // Extract date
            var dateMatch = DateRx().Match(clean);
            if (dateMatch.Success)
            {
                cert.Date = NormalizeDate(dateMatch.Value);
                clean = (clean[..dateMatch.Index] + clean[(dateMatch.Index + dateMatch.Length)..]).Trim().Trim('-', '|', '·', '–', ' ');
            }

            // "Name – Issuer" or "Name | Issuer"
            var sepMatch = Regex.Match(clean, @"^(.+?)\s*[|–\-]\s*(.+)$");
            if (sepMatch.Success)
            {
                cert.Name = sepMatch.Groups[1].Value.Trim();
                cert.Issuer = sepMatch.Groups[2].Value.Trim();
            }
            else
            {
                cert.Name = clean;
            }

            if (!string.IsNullOrWhiteSpace(cert.Name))
                results.Add(cert);
        }

        return results;
    }

    // ── Languages ─────────────────────────────────────────────────────────────

    private static readonly string[] ProficiencyLevels =
        ["native", "fluent", "advanced", "intermediate", "basic", "beginner", "elementary", "proficient", "working",
         // Spanish
         "nativo", "nativa", "fluido", "fluida", "bilingüe", "bilingue", "avanzado", "avanzada", "intermedio", "intermedia", "básico", "basico", "principiante",
         // Simplified Chinese
         "母语", "流利", "熟练", "良好", "精通", "日常交流", "初级", "入门",
         // Traditional Chinese
         "母語", "熟練", "初級", "入門"];

    private static List<LanguageModel> ParseLanguagesSection(List<string> lines)
    {
        var results = new List<LanguageModel>();

        foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l)))
        {
            var clean = BulletRx().Replace(line, "").Trim();

            // Handle comma-separated list on a single line
            var parts = clean.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries);
            foreach (var part in parts)
            {
                var p = part.Trim();
                // "Language (Proficiency)" or "Language – Proficiency" or "Language: Proficiency"
                var sepMatch = Regex.Match(p, @"^([^(:\-–]+?)\s*[:(–\-]\s*(.+?)\s*\)?$");
                if (sepMatch.Success)
                {
                    var langName = sepMatch.Groups[1].Value.Trim().TrimEnd('(');
                    var profRaw = sepMatch.Groups[2].Value.Trim().ToLowerInvariant();
                    results.Add(new LanguageModel
                    {
                        Language = langName,
                        Proficiency = MapProficiency(profRaw)
                    });
                }
                else if (!string.IsNullOrWhiteSpace(p))
                {
                    // Try to find a proficiency keyword inside the string
                    var found = ProficiencyLevels.FirstOrDefault(lv => p.Contains(lv, StringComparison.OrdinalIgnoreCase));
                    var langName = found is not null
                        ? Regex.Replace(p, found, "", RegexOptions.IgnoreCase).Trim().Trim('-', '–', ' ')
                        : p;
                    if (!string.IsNullOrWhiteSpace(langName))
                        results.Add(new LanguageModel
                        {
                            Language = langName,
                            Proficiency = found is not null ? MapProficiency(found) : "Intermediate"
                        });
                }
            }
        }

        return results;
    }

    private static string MapProficiency(string raw)
    {
        var t = raw.Trim();
        // Simplified Chinese
        if (t is "母语" or "第一语言") return "Native";
        if (t is "流利" or "双语") return "Fluent";
        if (t is "熟练" or "良好" or "精通") return "Advanced";
        if (t is "日常交流" or "一般" or "基本") return "Intermediate";
        if (t is "初级" or "入门") return "Basic";
        // Traditional Chinese
        if (t is "母語" or "第一語言") return "Native";
        if (t is "流暢" or "雙語") return "Fluent";
        if (t is "熟練" or "精通") return "Advanced";
        if (t is "初級" or "入門") return "Basic";

        return t.ToLowerInvariant() switch
        {
            "native" or "mother tongue" or "first language" => "Native",
            "fluent" or "bilingual" or "full professional" => "Fluent",
            "advanced" or "proficient" or "professional" or "upper-intermediate" => "Advanced",
            "intermediate" or "working" or "conversational" or "limited working" => "Intermediate",
            "basic" or "beginner" or "elementary" or "novice" or "a1" or "a2" => "Basic",
            // Spanish
            "nativo" or "nativa" => "Native",
            "fluido" or "fluida" or "bilingüe" or "bilingue" => "Fluent",
            "avanzado" or "avanzada" => "Advanced",
            "intermedio" or "intermedia" => "Intermediate",
            "básico" or "basico" or "principiante" => "Basic",
            _ => "Intermediate"
        };
    }

    // ── Interests ─────────────────────────────────────────────────────────────

    private static List<string> ParseInterestsSection(List<string> lines)
    {
        var results = new List<string>();

        foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l)))
        {
            var clean = BulletRx().Replace(line, "").Trim();
            // Split on common list separators; also accept one interest per line
            var items = clean.Split([',', ';', '|', '·', '•'], StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim()).Where(s => s.Length > 0);
            results.AddRange(items);
        }

        return results.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    // ── Referees ──────────────────────────────────────────────────────────────

    private static List<RefereeModel> ParseRefereesSection(List<string> lines)
    {
        var results = new List<RefereeModel>();

        // Check for "Available on request" / "References available upon request" style
        var allText = string.Join(" ", lines).ToLowerInvariant();
        if (allText.Contains("available") || allText.Contains("upon request") || allText.Contains("on request"))
            return results; // empty — the preview will show "Available on request"

        // Group non-blank runs into per-referee blocks
        var blocks = new List<List<string>>();
        var current = new List<string>();
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                if (current.Count > 0) { blocks.Add(current); current = []; }
            }
            else
            {
                current.Add(line.Trim());
            }
        }
        if (current.Count > 0) blocks.Add(current);

        foreach (var block in blocks)
        {
            if (block.Count == 0) continue;

            // A tab character in any line signals a two-column layout (ExtractLines inserts \t
            // when the gap between consecutive words exceeds 8pt, indicating a column separator).
            bool isTwoColumn = block.Any(l => l.Contains('\t'));

            if (isTwoColumn)
            {
                var leftLines  = new List<string>();
                var rightLines = new List<string>();

                foreach (var line in block)
                {
                    var tabIdx = line.IndexOf('\t');
                    if (tabIdx >= 0)
                    {
                        var left  = line[..tabIdx].Trim();
                        var right = line[(tabIdx + 1)..].Trim();
                        if (!string.IsNullOrWhiteSpace(left))  leftLines.Add(left);
                        if (!string.IsNullOrWhiteSpace(right)) rightLines.Add(right);
                    }
                    else
                    {
                        // Single-column line — belongs to the left referee (most common case)
                        leftLines.Add(line);
                    }
                }

                var leftRef = ParseRefereeBlock(leftLines);
                if (leftRef != null) results.Add(leftRef);

                var rightRef = ParseRefereeBlock(rightLines);
                if (rightRef != null) results.Add(rightRef);
            }
            else
            {
                var referee = ParseRefereeBlock(block);
                if (referee != null) results.Add(referee);
            }
        }

        return results;
    }

    private static RefereeModel? ParseRefereeBlock(List<string> lines)
    {
        if (lines.Count == 0) return null;
        var referee = new RefereeModel();

        foreach (var line in lines)
        {
            var clean = BulletRx().Replace(line.Replace('\t', ' '), "").Trim();
            if (string.IsNullOrEmpty(clean)) continue;

            if (string.IsNullOrEmpty(referee.Name))
            {
                referee.Name = clean;
                continue;
            }

            var emailMatch = EmailRx().Match(clean);
            if (emailMatch.Success && referee.Email is null)
            {
                referee.Email = emailMatch.Value;
                continue;
            }

            var phoneMatch = PhoneRx().Match(clean);
            if (phoneMatch.Success && referee.Phone is null && phoneMatch.Value.Count(char.IsDigit) >= 7)
            {
                referee.Phone = phoneMatch.Value.Trim();
                continue;
            }

            // "Title, Company" or "Title | Company" or just title/company
            var sepMatch = Regex.Match(clean, @"^(.+?)\s*[,|–\-]\s*(.+)$");
            if (sepMatch.Success && referee.Title is null)
            {
                referee.Title   = sepMatch.Groups[1].Value.Trim();
                referee.Company = sepMatch.Groups[2].Value.Trim();
            }
            else if (referee.Title is null)
            {
                referee.Title = clean;
            }
            else if (referee.Company is null)
            {
                referee.Company = clean;
            }
        }

        return string.IsNullOrWhiteSpace(referee.Name) ? null : referee;
    }
}
