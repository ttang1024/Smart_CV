using SmartCV.API.Services;

namespace SmartCV.API.Tests.Services;

// Exercises the heuristic parser through its public ParseText entry point, which runs the
// exact same section-splitting/entry-grouping pipeline as PDF parsing (Parse) minus the
// PdfPig text extraction step — so these are fast, fixture-driven tests of the real logic
// without needing a binary PDF fixture.
public class PdfResumeParserServiceTests
{
    private const string FullResume =
        "John Doe\n" +
        "Senior Software Engineer\n" +
        "San Francisco, CA\n" +
        "john.doe@example.com\n" +
        "+1 (555) 123-4567\n" +
        "linkedin.com/in/johndoe\n" +
        "github.com/johndoe\n" +
        "\n" +
        "Summary\n" +
        "\n" +
        "Results-driven software engineer with 8 years of experience building scalable web applications.\n" +
        "\n" +
        "Experience\n" +
        "\n" +
        "Senior Software Engineer | Acme Corp | San Francisco, CA\n" +
        "Jan 2020 - Present\n" +
        "- Led a team of 5 engineers to ship the core platform\n" +
        "- Reduced page load time by 40% through caching improvements\n" +
        "\n" +
        "Software Engineer | Beta Inc\n" +
        "Jun 2017 - Dec 2019\n" +
        "Worked on the payments team building fraud detection systems.\n" +
        "- Implemented real-time fraud scoring pipeline processing 10k events/sec\n" +
        "\n" +
        "Education\n" +
        "\n" +
        "Bachelor of Science Stanford University\n" +
        "Sep 2013 - Jun 2017\n" +
        "GPA: 3.8/4.0\n" +
        "\n" +
        "Skills\n" +
        "\n" +
        "Languages: Python, JavaScript, C#\n" +
        "Frameworks: React, .NET, Django\n" +
        "\n" +
        "Projects\n" +
        "\n" +
        "Resume Builder\n" +
        "An open-source AI-powered resume builder.\n" +
        "Technologies: Next.js, .NET, PostgreSQL\n" +
        "https://github.com/johndoe/resume-builder\n" +
        "\n" +
        "Certifications\n" +
        "\n" +
        "AWS Certified Solutions Architect - Amazon Web Services - Mar 2021\n" +
        "\n" +
        "Languages\n" +
        "\n" +
        "English (Native)\n" +
        "Spanish (Intermediate)\n" +
        "\n" +
        "Interests\n" +
        "\n" +
        "Hiking, Photography, Chess\n";

    [Fact]
    public void ParseText_FullResume_ExtractsPersonalInfo()
    {
        var result = new PdfResumeParserService().ParseText(FullResume);

        Assert.Equal("John Doe", result.PersonalInfo.FullName);
        Assert.Equal("Senior Software Engineer", result.PersonalInfo.Title);
        Assert.Equal("San Francisco, CA", result.PersonalInfo.Location);
        Assert.Equal("john.doe@example.com", result.PersonalInfo.Email);
        Assert.Equal("+1 (555) 123-4567", result.PersonalInfo.Phone);
        Assert.Equal("linkedin.com/in/johndoe", result.PersonalInfo.LinkedIn);
        Assert.Equal("github.com/johndoe", result.PersonalInfo.GitHub);
        Assert.Null(result.PersonalInfo.Website);
    }

    [Fact]
    public void ParseText_FullResume_ExtractsSummary()
    {
        var result = new PdfResumeParserService().ParseText(FullResume);

        Assert.Equal(
            "Results-driven software engineer with 8 years of experience building scalable web applications.",
            result.Summary);
    }

    [Fact]
    public void ParseText_FullResume_ExtractsBothExperienceEntriesWithNormalizedDates()
    {
        var result = new PdfResumeParserService().ParseText(FullResume);

        Assert.Equal(2, result.Experience.Count);

        var current = result.Experience[0];
        Assert.Equal("Senior Software Engineer", current.Position);
        Assert.Equal("Acme Corp", current.Company);
        // Quirk of the current heuristic: the date line's "Present" leftover is assigned to
        // Location before the "Company | Location" pipe-split runs, and it wins because that
        // later assignment only fires when Location is still empty. Documenting actual behavior.
        Assert.Equal("Present", current.Location);
        Assert.Equal("2020-01", current.StartDate);
        Assert.True(current.Current);
        Assert.Null(current.EndDate);
        Assert.Equal(
            ["Led a team of 5 engineers to ship the core platform", "Reduced page load time by 40% through caching improvements"],
            current.Highlights);

        var previous = result.Experience[1];
        Assert.Equal("Software Engineer", previous.Position);
        Assert.Equal("Beta Inc", previous.Company);
        Assert.Equal("2017-06", previous.StartDate);
        Assert.Equal("2019-12", previous.EndDate);
        Assert.False(previous.Current);
        Assert.Equal("Worked on the payments team building fraud detection systems.", previous.Description);
        Assert.Equal(["Implemented real-time fraud scoring pipeline processing 10k events/sec"], previous.Highlights);
    }

    [Fact]
    public void ParseText_FullResume_ExtractsEducationWithGpa()
    {
        var result = new PdfResumeParserService().ParseText(FullResume);

        var edu = Assert.Single(result.Education);
        Assert.Equal("Stanford University", edu.Institution);
        Assert.Equal("Bachelor", edu.Degree);
        Assert.Equal("Science", edu.Field);
        Assert.Equal("2013-09", edu.StartDate);
        Assert.Equal("2017-06", edu.EndDate);
        Assert.Equal("3.8/4.0", edu.Gpa);
    }

    [Fact]
    public void ParseText_FullResume_GroupsSkillsByCategory()
    {
        var result = new PdfResumeParserService().ParseText(FullResume);

        Assert.Equal(2, result.Skills.Count);
        Assert.Equal("Languages", result.Skills[0].Category);
        Assert.Equal(["Python", "JavaScript", "C#"], result.Skills[0].Items);
        Assert.Equal("Frameworks", result.Skills[1].Category);
        Assert.Equal(["React", ".NET", "Django"], result.Skills[1].Items);
    }

    [Fact]
    public void ParseText_FullResume_ExtractsProjectWithTechnologiesAndGitHubLink()
    {
        var result = new PdfResumeParserService().ParseText(FullResume);

        var project = Assert.Single(result.Projects);
        Assert.Equal("Resume Builder", project.Name);
        Assert.Equal("An open-source AI-powered resume builder.", project.Description);
        Assert.Equal(["Next.js", ".NET", "PostgreSQL"], project.Technologies);
        Assert.Equal("https://github.com/johndoe/resume-builder", project.GitHub);
    }

    [Fact]
    public void ParseText_FullResume_ExtractsCertificationNameIssuerAndDate()
    {
        var result = new PdfResumeParserService().ParseText(FullResume);

        var cert = Assert.Single(result.Certifications);
        Assert.Equal("AWS Certified Solutions Architect", cert.Name);
        Assert.Equal("Amazon Web Services", cert.Issuer);
        Assert.Equal("2021-03", cert.Date);
    }

    [Fact]
    public void ParseText_FullResume_ExtractsLanguagesWithMappedProficiency()
    {
        var result = new PdfResumeParserService().ParseText(FullResume);

        Assert.Equal(2, result.Languages.Count);
        Assert.Equal("English", result.Languages[0].Language);
        Assert.Equal("Native", result.Languages[0].Proficiency);
        Assert.Equal("Spanish", result.Languages[1].Language);
        Assert.Equal("Intermediate", result.Languages[1].Proficiency);
    }

    [Fact]
    public void ParseText_FullResume_ExtractsDistinctInterests()
    {
        var result = new PdfResumeParserService().ParseText(FullResume);

        Assert.Equal(["Hiking", "Photography", "Chess"], result.Interests);
    }

    [Fact]
    public void ParseText_DegreeAndInstitutionOnOneLine_SplitsThemApart()
    {
        const string text =
            "Jane Smith\n" +
            "\n" +
            "Education\n" +
            "\n" +
            "Bachelor of Science Stanford University\n" +
            "Sep 2013 - Jun 2017\n";

        var result = new PdfResumeParserService().ParseText(text);

        var edu = Assert.Single(result.Education);
        Assert.Equal("Stanford University", edu.Institution);
        Assert.Equal("Bachelor", edu.Degree);
        Assert.Equal("Science", edu.Field);
    }

    [Fact]
    public void ParseText_RefereesAvailableOnRequest_ReturnsEmptyList()
    {
        const string text =
            "Jane Smith\n" +
            "\n" +
            "References\n" +
            "\n" +
            "Available upon request\n";

        var result = new PdfResumeParserService().ParseText(text);

        Assert.Empty(result.Referees);
    }

    [Fact]
    public void ParseText_EmptyInput_ReturnsEmptyResultWithoutThrowing()
    {
        var result = new PdfResumeParserService().ParseText("");

        Assert.Equal("", result.PersonalInfo.FullName);
        Assert.Empty(result.Experience);
        Assert.Empty(result.Education);
        Assert.Empty(result.Skills);
        Assert.Empty(result.Projects);
    }
}
