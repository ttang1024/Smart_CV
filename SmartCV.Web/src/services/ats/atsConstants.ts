import type { ResumeSection } from '../../types/resume';

export const CORE_SECTIONS: Array<{ key: ResumeSection; label: string }> = [
  { key: 'summary', label: 'Professional Summary' },
  { key: 'experience', label: 'Work Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
];

export const ACTION_VERBS = new Set([
  'achieved', 'architected', 'automated', 'built', 'coached', 'created', 'delivered',
  'designed', 'developed', 'directed', 'drove', 'enabled', 'engineered', 'established',
  'expanded', 'implemented', 'improved', 'increased', 'launched', 'led', 'managed',
  'migrated', 'optimized', 'owned', 'reduced', 'resolved', 'scaled', 'shipped',
  'streamlined', 'transformed',
]);

export const DECORATIVE_SYMBOL_PATTERN = /[★☆◆◇●○■□▲▶✓✔✦✧]/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /(\+?\d[\d\s().-]{7,}\d)/;
export const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
