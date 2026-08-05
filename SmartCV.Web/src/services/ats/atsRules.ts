import type { AtsContext, AtsIssue, AtsIssueCategory } from './atsTypes';
import {
  CORE_SECTIONS, DECORATIVE_SYMBOL_PATTERN, EMAIL_PATTERN, PHONE_PATTERN, URL_PATTERN,
} from './atsConstants';
import { clean, sectionHasContent, wordCount } from './atsText';

function addPass(passed: AtsIssue[], id: string, category: AtsIssueCategory, title: string, detail: string) {
  passed.push({ id, category, title, detail, severity: 'pass', fix: '', points: 0 });
}

// NOTE: The evaluators below push to `issues`/`passed` in the exact same order
// as the original single function. Final ordering of `issues` is decided by a
// stable sort on (severity, points), so preserving push order keeps tie-breaks
// — and therefore the output — identical.

export function evaluateContact({ resume }: AtsContext, issues: AtsIssue[], passed: AtsIssue[]) {
  const info = resume.personalInfo;
  if (!info.fullName.trim()) {
    issues.push({
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
    issues.push({
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
    issues.push({
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
    issues.push({
      id: 'missing-location',
      severity: 'warning',
      category: 'contact',
      title: 'Location is missing',
      detail: 'Location can affect recruiter filtering, remote eligibility, and time-zone matching.',
      fix: 'Add city, region, country, or remote preference.',
      points: 4,
    });
  }
}

export function evaluateSections({ resume, missingCoreSections }: AtsContext, issues: AtsIssue[], passed: AtsIssue[]) {
  for (const section of CORE_SECTIONS) {
    if (!sectionHasContent(resume, section.key)) {
      issues.push({
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
}

export function evaluateContent(ctx: AtsContext, issues: AtsIssue[], passed: AtsIssue[]) {
  const { resume, words, bullets, quantifiedBulletCount, actionVerbBulletCount } = ctx;

  const summaryWords = wordCount(clean(resume.summary));
  if (summaryWords > 0 && (summaryWords < 30 || summaryWords > 95)) {
    issues.push({
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
    issues.push({
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
      issues.push({
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
      issues.push({
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
    issues.push({
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
    issues.push({
      id: 'too-short',
      severity: 'warning',
      category: 'content',
      title: 'Resume may be too sparse',
      detail: `The resume has about ${words} words. ATS matching may be weak if important keywords are missing.`,
      fix: 'Add role-relevant skills, achievements, tools, projects, and certifications.',
      points: 7,
    });
  } else if (words > 950) {
    issues.push({
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
}

export function evaluateSkills({ resume }: AtsContext, issues: AtsIssue[], passed: AtsIssue[]) {
  const skillsCount = resume.skills.flatMap(skill => skill.items).filter(item => item.trim()).length;
  if (skillsCount > 0 && skillsCount < 8) {
    issues.push({
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
}

export function evaluateLinksAndSymbols({ resume, plainText }: AtsContext, issues: AtsIssue[], passed: AtsIssue[]) {
  const info = resume.personalInfo;
  const maybeUrls = [
    info.website,
    info.linkedin,
    info.github,
    ...resume.experience.flatMap(exp => (exp.projects ?? []).map(project => project.url)),
    ...resume.experience.flatMap(exp => exp.productLinks ?? []),
    ...resume.projects.flatMap(project => [project.url, project.github]),
  ].filter(Boolean) as string[];
  const malformedUrls = maybeUrls.filter(url => !URL_PATTERN.test(url.trim()));
  if (malformedUrls.length > 0) {
    issues.push({
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
    issues.push({
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
}

export function evaluateBreadthAndTarget({ resume, nonEmptySections }: AtsContext, issues: AtsIssue[]) {
  if (nonEmptySections.length < 4) {
    issues.push({
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
    issues.push({
      id: 'no-target-job',
      severity: 'info',
      category: 'keywords',
      title: 'No target job saved',
      detail: 'A target role helps align headings, skills, and language with ATS keyword filters.',
      fix: 'Set a target job or use AI Optimize with a job description.',
      points: 2,
    });
  }
}
