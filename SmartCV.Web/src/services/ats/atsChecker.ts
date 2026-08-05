import type { Resume } from '../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../types/resume';
import { CORE_SECTIONS } from './atsConstants';
import { clean, collectResumeText, hasActionVerb, hasMetric, sectionHasContent, wordCount } from './atsText';
import type { AtsContext, AtsCheckResult, AtsIssue, AtsIssueSeverity } from './atsTypes';
import {
  evaluateBreadthAndTarget,
  evaluateContact,
  evaluateContent,
  evaluateLinksAndSymbols,
  evaluateSections,
  evaluateSkills,
} from './atsRules';

export type {
  AtsIssueSeverity,
  AtsIssueCategory,
  AtsIssue,
  AtsCheckResult,
} from './atsTypes';

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

  const ctx: AtsContext = {
    resume,
    plainText,
    words,
    bullets,
    quantifiedBulletCount,
    actionVerbBulletCount,
    nonEmptySections,
    missingCoreSections,
  };

  // Order matters: evaluators push in the same sequence as the original
  // single-function implementation (see note in atsRules.ts).
  evaluateContact(ctx, issues, passed);
  evaluateSections(ctx, issues, passed);
  evaluateContent(ctx, issues, passed);
  evaluateSkills(ctx, issues, passed);
  evaluateLinksAndSymbols(ctx, issues, passed);
  evaluateBreadthAndTarget(ctx, issues);

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
