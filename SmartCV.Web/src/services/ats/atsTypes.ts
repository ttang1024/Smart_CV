import type { Resume, ResumeSection } from '../../types/resume';

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

/**
 * Derived metrics shared by every rule evaluator. Built once in runAtsCheck so
 * the individual rule functions stay pure and order-preserving.
 */
export interface AtsContext {
  resume: Resume;
  plainText: string;
  words: number;
  bullets: string[];
  quantifiedBulletCount: number;
  actionVerbBulletCount: number;
  nonEmptySections: ResumeSection[];
  missingCoreSections: string[];
}
