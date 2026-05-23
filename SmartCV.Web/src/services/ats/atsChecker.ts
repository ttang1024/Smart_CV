import type { Resume, ResumeSection } from '../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../types/resume';
import { richTextToPlainText } from '../../lib/richText';

export type AtsIssueSeverity = 'critical' | 'warning' | 'info' | 'pass';
export type AtsIssueCategory = 'content' | 'keywords' | 'format' | 'sections' | 'contact';

export interface AtsIssue {
  id: string;
  severity: AtsIssueSeverity;
  category: AtsIssueCategory;
  title: string;
  detail: string;
  fix: string;
  points: number;
}

export interface AtsCheckResult {
  score: number;
  verdict: 'Strong' | 'Good' | 'Needs work' | 'At risk';
  summary: string;
  issues: AtsIssue[];
  passed: AtsIssue[];
  stats: {
    wordCount: number;
    bulletCount: number;
    quantifiedBulletCount: number;
    actionVerbBulletCount: number;
    sectionCount: number;
    missingCoreSections: string[];
  };
}

const CORE_SECTIONS: Array<{ key: ResumeSection; label: string }> = [
  { key: 'summary', label: 'Professional Summary' },
  { key: 'experience', label: 'Work Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
];

const ACTION_VERBS = new Set([
  'achieved', 'architected', 'automated', 'built', 'coached', 'created', 'delivered',
  'designed', 'developed', 'directed', 'drove', 'enabled', 'engineered', 'established',
  'expanded', 'implemented', 'improved', 'increased', 'launched', 'led', 'managed',
  'migrated', 'optimized', 'owned', 'reduced', 'resolved', 'scaled', 'shipped',
  'streamlined', 'transformed',
]);

const DECORATIVE_SYMBOL_PATTERN = /[★☆◆◇●○■□▲▶✓✔✦✧]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

function clean(value: string | undefined): string {
  return richTextToPlainText(value ?? '').replace(/\s+/g, ' ').trim();
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function sectionHasContent(resume: Resume, section: ResumeSection): boolean {
  switch (section) {
    case 'summary':
      return clean(resume.summary).length > 0;
    case 'coreHighlights':
      return (resume.coreHighlights ?? []).some(item => clean(item.text).length > 0);
    case 'experience':
      return resume.experience.some(exp =>
        [exp.company, exp.position, exp.startDate, exp.endDate, exp.description, ...exp.highlights]
          .some(value => clean(value).length > 0)
      );
    case 'education':
      return resume.education.some(edu =>
        [edu.institution, edu.degree, edu.field, edu.startDate, edu.endDate].some(value => clean(value).length > 0)
      );
    case 'skills':
      return resume.skills.some(skill => skill.items.some(item => item.trim().length > 0));
    case 'projects':
      return resume.projects.some(project =>
        [project.name, project.description, ...project.highlights, ...project.technologies].some(value => clean(value).length > 0)
      );
    case 'certifications':
      return resume.certifications.some(cert => [cert.name, cert.issuer].some(value => clean(value).length > 0));
    case 'languages':
      return resume.languages.some(language => language.language.trim().length > 0);
    case 'interests':
      return (resume.interests ?? []).some(interest => interest.name.trim().length > 0);
    case 'achievements':
      return (resume.achievements ?? []).some(achievement => [achievement.title, achievement.description].some(value => clean(value).length > 0));
    case 'referees':
      return (resume.referees ?? []).some(referee => [referee.name, referee.email, referee.phone].some(value => clean(value).length > 0));
    case 'personalInfo':
      return Object.values(resume.personalInfo).some(value => clean(value).length > 0);
  }
}

function collectResumeText(resume: Resume): string {
  const parts: Array<string | undefined> = [
    resume.personalInfo.fullName,
    resume.personalInfo.title,
    resume.personalInfo.email,
    resume.personalInfo.phone,
    resume.personalInfo.location,
    resume.personalInfo.website,
    resume.personalInfo.linkedin,
    resume.personalInfo.github,
    clean(resume.summary),
    ...(resume.coreHighlights ?? []).map(item => clean(item.text)),
    ...resume.experience.flatMap(exp => [
      exp.position,
      exp.company,
      exp.location,
      exp.startDate,
      exp.endDate,
      clean(exp.description),
      ...(exp.productLinks ?? []),
      ...exp.highlights.map(clean),
    ]),
    ...resume.education.flatMap(edu => [edu.institution, edu.degree, edu.field, edu.location, edu.gpa, edu.honors]),
    ...resume.skills.flatMap(skill => [skill.category, ...skill.items]),
    ...resume.projects.flatMap(project => [
      project.name,
      clean(project.description),
      project.url,
      project.github,
      ...project.technologies,
      ...project.highlights.map(clean),
    ]),
    ...resume.certifications.flatMap(cert => [cert.name, cert.issuer, cert.credentialId, cert.url]),
    ...resume.languages.map(language => `${language.language} ${language.proficiency}`),
    ...(resume.achievements ?? []).flatMap(achievement => [achievement.title, achievement.issuer, clean(achievement.description)]),
  ];

  return parts.filter((part): part is string => Boolean(part)).join('\n');
}

function hasActionVerb(text: string): boolean {
  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
  return ACTION_VERBS.has(firstWord);
}

function hasMetric(text: string): boolean {
  return /\d|%|\$|£|€|x\b|times?\b|million|billion|thousand|k\b/i.test(text);
}

function addIssue(issues: AtsIssue[], issue: AtsIssue) {
  issues.push(issue);
}

function addPass(passed: AtsIssue[], id: string, category: AtsIssueCategory, title: string, detail: string) {
  passed.push({ id, category, title, detail, severity: 'pass', fix: '', points: 0 });
}

export function runAtsCheck(resume: Resume): AtsCheckResult {
  const issues: AtsIssue[] = [];
  const passed: AtsIssue[] = [];
  const plainText = collectResumeText(resume);
  const words = wordCount(plainText);
  const bullets = [
    ...(resume.coreHighlights ?? []).map(item => clean(item.text)),
    ...resume.experience.flatMap(exp => exp.highlights.map(clean)),
    ...resume.projects.flatMap(project => project.highlights.map(clean)),
    ...(resume.achievements ?? []).map(achievement => clean(achievement.description)),
  ].filter(Boolean);
  const quantifiedBulletCount = bullets.filter(hasMetric).length;
  const actionVerbBulletCount = bullets.filter(hasActionVerb).length;
  const nonEmptySections = DEFAULT_SECTION_ORDER.filter(section => sectionHasContent(resume, section));
  const missingCoreSections = CORE_SECTIONS
    .filter(section => !sectionHasContent(resume, section.key))
    .map(section => section.label);

  const info = resume.personalInfo;
  if (!info.fullName.trim()) {
    addIssue(issues, {
      id: 'missing-name',
      severity: 'critical',
      category: 'contact',
      title: 'Missing candidate name',
      detail: 'ATS systems and recruiters need a clear candidate name at the top of the resume.',
      fix: 'Add your full name in Personal Information.',
      points: 12,
    });
  } else {
    addPass(passed, 'has-name', 'contact', 'Candidate name found', 'Your resume has a clear name field.');
  }

  if (!EMAIL_PATTERN.test(info.email.trim())) {
    addIssue(issues, {
      id: 'missing-valid-email',
      severity: 'critical',
      category: 'contact',
      title: 'Missing or invalid email',
      detail: 'Many ATS workflows use email as the primary candidate identifier.',
      fix: 'Add a standard email address such as name@example.com.',
      points: 12,
    });
  } else {
    addPass(passed, 'has-email', 'contact', 'Valid email found', 'Your email uses a standard ATS-readable format.');
  }

  if (!PHONE_PATTERN.test(info.phone.trim())) {
    addIssue(issues, {
      id: 'missing-phone',
      severity: 'warning',
      category: 'contact',
      title: 'Phone number is missing or hard to read',
      detail: 'Recruiters often call directly from ATS contact records.',
      fix: 'Add a phone number with digits and standard separators.',
      points: 5,
    });
  } else {
    addPass(passed, 'has-phone', 'contact', 'Phone number found', 'Your phone number appears readable.');
  }

  if (!info.location.trim()) {
    addIssue(issues, {
      id: 'missing-location',
      severity: 'warning',
      category: 'contact',
      title: 'Location is missing',
      detail: 'Location can affect recruiter filtering, remote eligibility, and time-zone matching.',
      fix: 'Add city, region, country, or remote preference.',
      points: 4,
    });
  }

  for (const section of CORE_SECTIONS) {
    if (!sectionHasContent(resume, section.key)) {
      addIssue(issues, {
        id: `missing-${section.key}`,
        severity: 'critical',
        category: 'sections',
        title: `${section.label} section is missing`,
        detail: 'Core resume sections help ATS parsers classify your content correctly.',
        fix: `Add content to the ${section.label} section.`,
        points: 10,
      });
    }
  }

  if (missingCoreSections.length === 0) {
    addPass(passed, 'core-sections-present', 'sections', 'Core sections present', 'Summary, experience, education, and skills are all populated.');
  }

  const summaryWords = wordCount(clean(resume.summary));
  if (summaryWords > 0 && (summaryWords < 30 || summaryWords > 95)) {
    addIssue(issues, {
      id: 'summary-length',
      severity: 'warning',
      category: 'content',
      title: 'Summary length is not ideal',
      detail: `Your summary is ${summaryWords} words. ATS-friendly summaries usually work best at 30-95 words.`,
      fix: 'Make the summary concise, role-specific, and keyword-rich.',
      points: 4,
    });
  } else if (summaryWords > 0) {
    addPass(passed, 'summary-good-length', 'content', 'Summary length looks good', 'Your summary is concise enough for scanning.');
  }

  if (resume.experience.length > 0 && bullets.length < Math.min(3, resume.experience.length * 2)) {
    addIssue(issues, {
      id: 'too-few-bullets',
      severity: 'warning',
      category: 'content',
      title: 'Too few achievement bullets',
      detail: 'ATS ranking and recruiter review both benefit from concrete, scannable achievements.',
      fix: 'Add 3-5 achievement bullets for recent roles.',
      points: 7,
    });
  }

  if (bullets.length > 0) {
    const metricRatio = quantifiedBulletCount / bullets.length;
    if (metricRatio < 0.35) {
      addIssue(issues, {
        id: 'low-metrics',
        severity: 'warning',
        category: 'content',
        title: 'Add more measurable impact',
        detail: `${quantifiedBulletCount} of ${bullets.length} bullets include numbers, percentages, money, scale, or volume.`,
        fix: 'Add metrics such as revenue, users, cost savings, latency, team size, or delivery speed.',
        points: 8,
      });
    } else {
      addPass(passed, 'metrics-present', 'content', 'Measurable achievements found', 'A healthy share of your bullets include concrete metrics.');
    }

    const actionRatio = actionVerbBulletCount / bullets.length;
    if (actionRatio < 0.5) {
      addIssue(issues, {
        id: 'weak-action-verbs',
        severity: 'info',
        category: 'content',
        title: 'Start more bullets with strong verbs',
        detail: `${actionVerbBulletCount} of ${bullets.length} bullets start with strong action verbs.`,
        fix: 'Start bullets with verbs like Led, Built, Improved, Reduced, Delivered, or Shipped.',
        points: 4,
      });
    } else {
      addPass(passed, 'action-verbs-present', 'content', 'Strong action verbs found', 'Many bullets start with direct action verbs.');
    }
  }

  const longBullets = bullets.filter(bullet => wordCount(bullet) > 32);
  if (longBullets.length > 0) {
    addIssue(issues, {
      id: 'long-bullets',
      severity: 'info',
      category: 'format',
      title: 'Some bullets are long',
      detail: `${longBullets.length} bullet${longBullets.length === 1 ? '' : 's'} exceed 32 words, which can reduce scanability.`,
      fix: 'Split long bullets or cut them to one action, one method, and one result.',
      points: 3,
    });
  }

  if (words < 250) {
    addIssue(issues, {
      id: 'too-short',
      severity: 'warning',
      category: 'content',
      title: 'Resume may be too sparse',
      detail: `The resume has about ${words} words. ATS matching may be weak if important keywords are missing.`,
      fix: 'Add role-relevant skills, achievements, tools, projects, and certifications.',
      points: 7,
    });
  } else if (words > 950) {
    addIssue(issues, {
      id: 'too-long',
      severity: 'warning',
      category: 'content',
      title: 'Resume may be too long',
      detail: `The resume has about ${words} words. Recruiters may skip dense resumes.`,
      fix: 'Trim older or less relevant details and keep bullets focused on impact.',
      points: 5,
    });
  } else {
    addPass(passed, 'word-count-good', 'content', 'Resume length is in a useful range', `The resume has about ${words} words.`);
  }

  const skillsCount = resume.skills.flatMap(skill => skill.items).filter(item => item.trim()).length;
  if (skillsCount > 0 && skillsCount < 8) {
    addIssue(issues, {
      id: 'thin-skills',
      severity: 'warning',
      category: 'keywords',
      title: 'Skills section is thin',
      detail: `Only ${skillsCount} skill${skillsCount === 1 ? '' : 's'} found. ATS systems often match directly against skills and tools.`,
      fix: 'Add relevant tools, technologies, methodologies, platforms, and domain keywords.',
      points: 6,
    });
  } else if (skillsCount >= 8) {
    addPass(passed, 'skills-good', 'keywords', 'Skills coverage looks useful', `${skillsCount} skills are listed for keyword matching.`);
  }

  const maybeUrls = [
    info.website,
    info.linkedin,
    info.github,
    ...resume.experience.flatMap(exp => exp.productLinks ?? []),
    ...resume.projects.flatMap(project => [project.url, project.github]),
  ].filter(Boolean) as string[];
  const malformedUrls = maybeUrls.filter(url => !URL_PATTERN.test(url.trim()));
  if (malformedUrls.length > 0) {
    addIssue(issues, {
      id: 'malformed-urls',
      severity: 'info',
      category: 'format',
      title: 'Some links may not parse cleanly',
      detail: `${malformedUrls.length} link${malformedUrls.length === 1 ? '' : 's'} do not look like standard URLs.`,
      fix: 'Use simple URLs such as linkedin.com/in/name or https://portfolio.com.',
      points: 2,
    });
  }

  if (DECORATIVE_SYMBOL_PATTERN.test(plainText)) {
    addIssue(issues, {
      id: 'decorative-symbols',
      severity: 'info',
      category: 'format',
      title: 'Decorative symbols detected',
      detail: 'Some ATS parsers can misread decorative bullets, checkmarks, stars, or icons.',
      fix: 'Use simple text, commas, hyphens, and standard bullets for important content.',
      points: 3,
    });
  } else {
    addPass(passed, 'no-decorative-symbols', 'format', 'No risky decorative symbols found', 'The resume text avoids common parser-hostile symbols.');
  }

  if (nonEmptySections.length < 4) {
    addIssue(issues, {
      id: 'few-sections',
      severity: 'warning',
      category: 'sections',
      title: 'Few populated sections',
      detail: `${nonEmptySections.length} resume sections contain content.`,
      fix: 'Add projects, certifications, achievements, or languages if they strengthen your target role.',
      points: 4,
    });
  }

  if (!resume.targetJob?.trim()) {
    addIssue(issues, {
      id: 'no-target-job',
      severity: 'info',
      category: 'keywords',
      title: 'No target job saved',
      detail: 'A target role helps align headings, skills, and language with ATS keyword filters.',
      fix: 'Set a target job or use AI Optimize with a job description.',
      points: 2,
    });
  }

  const score = Math.max(0, Math.min(100, 100 - issues.reduce((sum, issue) => sum + issue.points, 0)));
  const verdict =
    score >= 85 ? 'Strong' :
    score >= 70 ? 'Good' :
    score >= 50 ? 'Needs work' :
    'At risk';

  const summary =
    score >= 85 ? 'This resume should parse cleanly and has solid ATS fundamentals.' :
    score >= 70 ? 'This resume is usable, but a few targeted improvements would help matching.' :
    score >= 50 ? 'This resume has several ATS risks that may reduce ranking or parser accuracy.' :
    'This resume is likely to struggle in ATS screening until the critical issues are fixed.';

  return {
    score,
    verdict,
    summary,
    issues: issues.sort((a, b) => {
      const order: Record<AtsIssueSeverity, number> = { critical: 0, warning: 1, info: 2, pass: 3 };
      return order[a.severity] - order[b.severity] || b.points - a.points;
    }),
    passed,
    stats: {
      wordCount: words,
      bulletCount: bullets.length,
      quantifiedBulletCount,
      actionVerbBulletCount,
      sectionCount: nonEmptySections.length,
      missingCoreSections,
    },
  };
}
