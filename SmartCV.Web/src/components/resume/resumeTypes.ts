import type { Resume } from '../../types/resume';

export type StyleId = 'classic' | 'modern' | 'executive' | 'minimal' | 'creative'
  | 'elegant' | 'academic' | 'split' | 'timeline' | 'custom';

export type CustomHeader = 'classic' | 'split';
export type CustomExp = 'list' | 'timeline';
export type CustomSectionStyle = 'bar' | 'underline' | 'plain';
export type CustomLayoutMode = 'single' | 'two-column';
export type CustomSkillsStyle = 'list' | 'tags';
export type CustomEduStyle = 'standard' | 'compact';
export type CustomSummaryStyle = 'paragraph' | 'callout';

export interface CustomOptions {
  header: CustomHeader;
  experience: CustomExp;
  skillsColumns: 1 | 2;
  sectionStyle: CustomSectionStyle;
  layoutMode: CustomLayoutMode;
  skillsStyle: CustomSkillsStyle;
  education: CustomEduStyle;
  summary: CustomSummaryStyle;
}

export const STYLES: { id: StyleId; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'executive', label: 'Executive' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'creative', label: 'Creative' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'academic', label: 'Academic' },
  { id: 'split', label: 'Split' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'custom', label: '✦ Custom' },
];

export interface ThemeColors { main: string; light: string; dark: string }

export interface PageMarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_PAGE_MARGINS_MM: PageMarginsMm = {
  top: 10,
  right: 10,
  bottom: 10,
  left: 10,
};

export type LayoutProps = {
  r: Resume;
  theme: ThemeColors;
  pageMarginsMm?: PageMarginsMm;
  backgroundColor?: string;
  fullNameColor?: string;
};

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

export function deriveTheme(main: string): ThemeColors {
  const [r, g, b] = hexToRgb(main);
  const light = rgbToHex(r + (255 - r) * 0.75, g + (255 - g) * 0.75, b + (255 - b) * 0.75);
  const dark = rgbToHex(r * 0.35, g * 0.35, b * 0.35);
  return { main, light, dark };
}
