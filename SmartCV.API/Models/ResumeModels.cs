namespace SmartCV.API.Models;

public class ResumeParseResult
{
    public PersonalInfoModel PersonalInfo { get; set; } = new();
    public string Summary { get; set; } = "";
    public List<ExperienceModel> Experience { get; set; } = [];
    public List<EducationModel> Education { get; set; } = [];
    public List<SkillModel> Skills { get; set; } = [];
    public List<ProjectModel> Projects { get; set; } = [];
    public List<CertificationModel> Certifications { get; set; } = [];
    public List<LanguageModel> Languages { get; set; } = [];
    public List<string> Interests { get; set; } = [];
    public List<AchievementModel> Achievements { get; set; } = [];
    public List<RefereeModel> Referees { get; set; } = [];
}

public class PersonalInfoModel
{
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Location { get; set; } = "";
    public string Title { get; set; } = "";
    public string? LinkedIn { get; set; }
    public string? GitHub { get; set; }
    public string? Website { get; set; }
}

public class ExperienceModel
{
    public string Company { get; set; } = "";
    public string Position { get; set; } = "";
    public string Location { get; set; } = "";
    public string StartDate { get; set; } = "";
    public string? EndDate { get; set; }
    public bool Current { get; set; }
    public string Description { get; set; } = "";
    public List<string> Highlights { get; set; } = [];
    public List<string> ProductLinks { get; set; } = [];
    public List<ExperienceProjectModel> Projects { get; set; } = [];
}

public class ExperienceProjectModel
{
    public string Name { get; set; } = "";
    public string? Url { get; set; }
    public string? Description { get; set; }
    public List<string> Highlights { get; set; } = [];
}

public class EducationModel
{
    public string Institution { get; set; } = "";
    public string Degree { get; set; } = "";
    public string Field { get; set; } = "";
    public string Location { get; set; } = "";
    public string StartDate { get; set; } = "";
    public string? EndDate { get; set; }
    public bool Current { get; set; }
    public string? Gpa { get; set; }
    public string? Honors { get; set; }
}

public class SkillModel
{
    public string Category { get; set; } = "";
    public List<string> Items { get; set; } = [];
}

public class ProjectModel
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public List<string> Technologies { get; set; } = [];
    public string? Url { get; set; }
    public string? GitHub { get; set; }
}

public class CertificationModel
{
    public string Name { get; set; } = "";
    public string Issuer { get; set; } = "";
    public string Date { get; set; } = "";
    public string? ExpiryDate { get; set; }
    public string? CredentialId { get; set; }
}

public class LanguageModel
{
    public string Language { get; set; } = "";
    public string Proficiency { get; set; } = "Intermediate";
}

public class AchievementModel
{
    public string Title { get; set; } = "";
    public string? Issuer { get; set; }
    public string? Date { get; set; }
    public string? Description { get; set; }
}

public class RefereeModel
{
    public string Name { get; set; } = "";
    public string? Title { get; set; }
    public string? Company { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}
