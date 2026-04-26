using System.Text.RegularExpressions;
using SmartCV.API.Models;
using UglyToad.PdfPig;

namespace SmartCV.API.Services;

public partial class PdfResumeParserService
{
    // ── Regex patterns ────────────────────────────────────────────────────────

    [GeneratedRegex(@"[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}", RegexOptions.IgnoreCase)]
    private static partial Regex EmailRx();

    [GeneratedRegex(@"(\+?[\d][\d\s\-().]{6,}\d)", RegexOptions.IgnoreCase)]
    private static partial Regex PhoneRx();

    [GeneratedRegex(@"(?:linkedin\.com/in/|linkedin\.com/pub/)([\w\-]+)", RegexOptions.IgnoreCase)]
    private static partial Regex LinkedInRx();

    [GeneratedRegex(@"github\.com/([\w\-]+)", RegexOptions.IgnoreCase)]
    private static partial Regex GitHubRx();

    [GeneratedRegex(@"https?://[\w\-./~?=%&#@+]+|www\.[\w\-./~?=%&#@+]+", RegexOptions.IgnoreCase)]
    private static partial Regex UrlRx();

    // Matches dates in English, Spanish, and Chinese formats
    // e.g. "Jan 2020", "enero 2020", "01/2020", "2020-01", "2020年3月", "2020年", "2020"
    [GeneratedRegex(
        @"(?:Jan(?:uary)?|Ene(?:ro)?|Feb(?:ruary|rero)?|Mar(?:ch|zo)?|Apr(?:il)?|Abr(?:il)?|May(?:o)?|Jun(?:e|io)?|Jul(?:y|io)?|Aug(?:ust)?|Ago(?:sto)?|Sep(?:t(?:ember|iembre)?)?|Oct(?:ober|ubre)?|Nov(?:ember|iembre)?|Dec(?:ember)?|Dic(?:iembre)?)\.?\s+\d{4}|\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}年(?:\d{1,2}月)?|\d{4}",
        RegexOptions.IgnoreCase)]
    private static partial Regex DateRx();

    // Matches a date range: <date> – <date|Present> (English, Spanish, Chinese)
    [GeneratedRegex(
        @"((?:Jan(?:uary)?|Ene(?:ro)?|Feb(?:ruary|rero)?|Mar(?:ch|zo)?|Apr(?:il)?|Abr(?:il)?|May(?:o)?|Jun(?:e|io)?|Jul(?:y|io)?|Aug(?:ust)?|Ago(?:sto)?|Sep(?:t(?:ember|iembre)?)?|Oct(?:ober|ubre)?|Nov(?:ember|iembre)?|Dec(?:ember)?|Dic(?:iembre)?)\.?\s+\d{4}|\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}年(?:\d{1,2}月)?|\d{4})\s*[-–—至]\s*((?:Jan(?:uary)?|Ene(?:ro)?|Feb(?:ruary|rero)?|Mar(?:ch|zo)?|Apr(?:il)?|Abr(?:il)?|May(?:o)?|Jun(?:e|io)?|Jul(?:y|io)?|Aug(?:ust)?|Ago(?:sto)?|Sep(?:t(?:ember|iembre)?)?|Oct(?:ober|ubre)?|Nov(?:ember|iembre)?|Dec(?:ember)?|Dic(?:iembre)?)\.?\s+\d{4}|\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}年(?:\d{1,2}月)?|\d{4}|Present|Current|Now|Actualidad|Actual|Presente|至今|现在|現在|目前)",
        RegexOptions.IgnoreCase)]
    private static partial Regex DateRangeRx();

    [GeneratedRegex(@"([\d.]+)\s*/\s*([\d.]+)", RegexOptions.IgnoreCase)]
    private static partial Regex GpaRx();

    [GeneratedRegex(@"\b(Bachelor|Master|PhD|Doctor|Associate|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|M\.?B\.?A\.?|B\.?Eng\.?|M\.?Eng\.?|B\.?Tech\.?|M\.?Tech\.?|Ph\.?D\.?|D\.?Phil\.?|Licenciatura|Licenciado|Ingenier[oía]|M[aá]ster|Maestr[ií]a|Doctorado|Grado|Bachillerato|Diplomado)\b|(?:学士|硕士|博士|大专|本科|學士|碩士|大專)(?:学位|學位|研究生)?", RegexOptions.IgnoreCase)]
    private static partial Regex DegreeRx();

    [GeneratedRegex(@"\b(magna cum laude|summa cum laude|cum laude|with honors|with distinction|honor roll|dean[''`]?s list)\b", RegexOptions.IgnoreCase)]
    private static partial Regex HonorsRx();

    [GeneratedRegex(@"\b(University|College|Institute|School|Academy|Polytechnic|Universidad|Facultad|Instituto)\b|(?:大学|学院|学校|大學|學院|學校)", RegexOptions.IgnoreCase)]
    private static partial Regex InstitutionKeywordRx();

    // Common academic field/subject words that should NOT be treated as institution-name prefixes
    private static readonly HashSet<string> AcademicFieldWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "technology", "science", "sciences", "arts", "engineering", "business",
        "commerce", "medicine", "law", "education", "management", "information",
        "computing", "mathematics", "statistics", "physics", "chemistry", "biology",
        "economics", "finance", "accounting", "administration", "studies", "design",
        "architecture", "health", "nursing", "psychology", "sociology", "history"
    };

    [GeneratedRegex(@"^\s*[•\-*▪▸►◆◉○●]\s*")]
    private static partial Regex BulletRx();

    // ── Section keyword map ───────────────────────────────────────────────────

    private enum SectionType { Header, Summary, Experience, Education, Skills, Projects, Certifications, Languages, Interests, Referees }

    private static readonly Dictionary<SectionType, string[]> SectionKeywords = new()
    {
        [SectionType.Summary]        = ["summary", "objective", "profile", "about me", "about", "overview", "professional summary", "career summary", "career objective", "professional profile",
                                        // Spanish
                                        "resumen", "perfil", "objetivo", "sobre mí", "sobre mi", "presentación", "presentacion", "perfil profesional", "acerca de mí", "acerca de mi",
                                        // Simplified Chinese
                                        "个人简介", "自我介绍", "个人概述", "职业概述", "职业目标", "求职意向", "个人陈述", "简介",
                                        // Traditional Chinese
                                        "個人簡介", "自我介紹", "個人概述", "職業概述", "職業目標", "求職意向", "個人陳述", "簡介"],
        [SectionType.Experience]     = ["experience", "work experience", "professional experience", "employment", "work history", "career history", "employment history", "professional background", "work",
                                        // Spanish
                                        "experiencia", "experiencia laboral", "experiencia profesional", "historial laboral", "trayectoria profesional", "experiencia de trabajo",
                                        // Simplified Chinese
                                        "工作经历", "工作经验", "职业经历", "职业经验", "工作背景", "职业背景", "实习经历", "实习经验", "社会实践",
                                        // Traditional Chinese
                                        "工作經歷", "工作經驗", "職業經歷", "職業經驗", "職業背景", "實習經歷", "實習經驗"],
        [SectionType.Education]      = ["education", "academic background", "academic history", "qualifications", "academic qualifications", "educational background", "academic",
                                        // Spanish
                                        "educación", "educacion", "formación académica", "formacion academica", "estudios", "formación", "formacion", "titulación", "titulacion",
                                        // Simplified Chinese
                                        "教育背景", "教育经历", "学历", "教育", "学习经历", "学术背景",
                                        // Traditional Chinese
                                        "教育經歷", "學歷", "學習經歷", "學術背景"],
        [SectionType.Skills]         = ["skills", "technical skills", "core competencies", "competencies", "technologies", "tech stack", "tools", "expertise", "key skills", "technical expertise", "programming skills", "professional skills",
                                        // Spanish
                                        "habilidades", "competencias", "conocimientos", "aptitudes", "destrezas técnicas", "destrezas tecnicas", "habilidades técnicas", "habilidades tecnicas",
                                        // Simplified Chinese
                                        "技能", "专业技能", "技术技能", "核心技能", "技术栈", "专业能力", "技能特长", "技术能力",
                                        // Traditional Chinese
                                        "專業技能", "技術技能", "技術棧", "專業能力", "技能特長", "技術能力"],
        [SectionType.Projects]       = ["projects", "project", "personal projects", "personal project", "side projects", "side project", "portfolio", "project experience", "key projects", "open source", "it project", "it projects",
                                        // Spanish
                                        "proyectos", "proyecto", "proyectos personales", "portafolio",
                                        // Simplified Chinese
                                        "项目经历", "项目经验", "项目", "个人项目",
                                        // Traditional Chinese
                                        "項目經歷", "項目經驗", "項目", "個人項目"],
        [SectionType.Certifications] = ["certifications", "certificates", "licenses", "awards", "achievements", "professional development", "accreditations",
                                        // Spanish
                                        "certificaciones", "certificados", "licencias", "premios", "logros", "acreditaciones",
                                        // Simplified Chinese
                                        "资格证书", "证书", "认证", "荣誉奖励", "奖励", "荣誉",
                                        // Traditional Chinese
                                        "資格證書", "證書", "認證", "榮譽獎勵", "獎勵", "榮譽"],
        [SectionType.Languages]      = ["languages", "language skills", "spoken languages",
                                        // Spanish
                                        "idiomas", "lenguas", "habilidades lingüísticas", "habilidades linguisticas",
                                        // Simplified Chinese
                                        "语言", "语言能力", "语言技能",
                                        // Traditional Chinese
                                        "語言", "語言能力", "語言技能"],
        [SectionType.Interests]      = ["interests", "hobbies", "activities", "personal interests", "extracurricular", "extracurricular activities", "volunteer", "volunteering",
                                        // Spanish
                                        "intereses", "aficiones", "actividades", "pasatiempos", "voluntariado",
                                        // Simplified Chinese
                                        "兴趣爱好", "爱好", "兴趣", "课外活动", "志愿服务",
                                        // Traditional Chinese
                                        "興趣愛好", "愛好", "興趣", "課外活動", "志願服務"],
        [SectionType.Referees]       = ["referees", "references", "professional references", "referee",
                                        // Spanish
                                        "referencias", "referentes",
                                        // Simplified Chinese
                                        "推荐人", "参考人",
                                        // Traditional Chinese
                                        "推薦人", "參考人"]
    };

    // ── Public entry points ───────────────────────────────────────────────────

    public ResumeParseResult Parse(Stream pdfStream)
    {
        var lines = ExtractLines(pdfStream);
        var sections = SplitIntoSections(lines);
        return BuildResume(sections);
    }

    /// <summary>Parse resume from raw text (e.g. produced by client-side OCR).</summary>
    public ResumeParseResult ParseText(string rawText)
    {
        var lines = rawText
            .Split(["\r\n", "\n", "\r"], StringSplitOptions.None)
            .Select(l => l.Trim())
            .ToList();
        var sections = SplitIntoSections(lines);
        return BuildResume(sections);
    }

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

    // ── Resume builder ────────────────────────────────────────────────────────

    private static ResumeParseResult BuildResume(Dictionary<SectionType, List<string>> sections)
    {
        return new ResumeParseResult
        {
            PersonalInfo   = ParsePersonalInfo(sections[SectionType.Header]),
            Summary        = string.Join(" ", sections[SectionType.Summary].Where(l => !string.IsNullOrWhiteSpace(l))).Trim(),
            Experience     = ParseExperienceSection(sections[SectionType.Experience]),
            Education      = ParseEducationSection(sections[SectionType.Education]),
            Skills         = ParseSkillsSection(sections[SectionType.Skills]),
            Projects       = ParseProjectsSection(sections[SectionType.Projects]),
            Certifications = ParseCertificationsSection(sections[SectionType.Certifications]),
            Languages      = ParseLanguagesSection(sections[SectionType.Languages]),
            Interests      = ParseInterestsSection(sections[SectionType.Interests]),
            Referees       = ParseRefereesSection(sections[SectionType.Referees])
        };
    }

    // ── Personal info ─────────────────────────────────────────────────────────

    private static PersonalInfoModel ParsePersonalInfo(List<string> lines)
    {
        var info = new PersonalInfoModel();
        var remaining = new List<string>();

        foreach (var line in lines.Where(l => !string.IsNullOrWhiteSpace(l)))
        {
            // Email
            var emailMatch = EmailRx().Match(line);
            if (emailMatch.Success && string.IsNullOrEmpty(info.Email))
            {
                info.Email = emailMatch.Value;
                continue;
            }

            // LinkedIn (before generic URL check)
            var liMatch = LinkedInRx().Match(line);
            if (liMatch.Success && info.LinkedIn is null)
            {
                info.LinkedIn = UrlRx().Match(line) is { Success: true } urlM ? urlM.Value : line.Trim();
                continue;
            }

            // GitHub
            var ghMatch = GitHubRx().Match(line);
            if (ghMatch.Success && info.GitHub is null)
            {
                info.GitHub = UrlRx().Match(line) is { Success: true } urlM2 ? urlM2.Value : line.Trim();
                continue;
            }

            // Generic URL → website
            // Keep !liMatch.Success so a duplicate LinkedIn URL isn't captured as website.
            // Allow GitHub-matching URLs through: if the GitHub profile was already set and this
            // is a different URL (e.g. a repo link), it should be captured as the website.
            var urlMatch = UrlRx().Match(line);
            if (urlMatch.Success && info.Website is null && !liMatch.Success)
            {
                info.Website = urlMatch.Value;
                continue;
            }

            // Phone (only digits/spaces/dashes/parens, length 7-15)
            var phoneMatch = PhoneRx().Match(line);
            if (phoneMatch.Success && string.IsNullOrEmpty(info.Phone)
                && phoneMatch.Value.Count(char.IsDigit) >= 7)
            {
                info.Phone = phoneMatch.Value.Trim();
                continue;
            }

            remaining.Add(line);
        }

        // From the non-contact lines, first non-empty = name, second = title or location
        var candidates = remaining.Where(l => !string.IsNullOrWhiteSpace(l)).ToList();

        if (candidates.Count > 0)
            info.FullName = candidates[0].Trim();

        if (candidates.Count > 1)
        {
            var second = candidates[1].Trim();
            // Looks like a location if it has a comma (including Chinese full-width ，) and is short
            if ((second.Contains(',') || second.Contains('，')) && second.Length < 50 && !second.Any(char.IsDigit))
                info.Location = second;
            else
                info.Title = second;
        }

        if (candidates.Count > 2)
        {
            var third = candidates[2].Trim();
            if (string.IsNullOrEmpty(info.Location) && (third.Contains(',') || third.Contains('，')) && third.Length < 50)
                info.Location = third;
            else if (string.IsNullOrEmpty(info.Title))
                info.Title = third;
        }

        return info;
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
