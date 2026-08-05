using System.Text.RegularExpressions;

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
}
