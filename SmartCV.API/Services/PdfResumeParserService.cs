using SmartCV.API.Models;

namespace SmartCV.API.Services;

// Heuristic resume parser. Implementation is split across partial files by concern:
//   .Patterns.cs     — regex patterns + section keyword map
//   .Sections.cs     — section splitting, entry grouping
//   .Dates.cs        — month map, date normalisation, "present" detection
//   .PersonalInfo.cs — header / contact-details parsing
//   .Experience.cs   — work experience
//   .Education.cs    — education
//   .Skills.cs       — skills
//   .Projects.cs     — projects
//   .Misc.cs         — certifications, languages, interests, referees
public partial class PdfResumeParserService
{
    private enum SectionType { Header, Summary, Experience, Education, Skills, Projects, Certifications, Languages, Interests, Referees }

    // ── Public entry points ───────────────────────────────────────────────────

    /// <summary>
    /// Parse resume text extracted in the browser (pdf.js text layer or OCR). Columns on
    /// one line are tab-separated, which the section parsers use to detect two-column blocks.
    /// </summary>
    public ResumeParseResult ParseText(string rawText)
    {
        var lines = rawText
            .Split(["\r\n", "\n", "\r"], StringSplitOptions.None)
            .Select(l => l.Trim())
            .ToList();
        var sections = SplitIntoSections(lines);
        return BuildResume(sections);
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
}
