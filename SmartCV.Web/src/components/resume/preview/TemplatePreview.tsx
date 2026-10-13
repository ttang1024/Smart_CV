import type { Resume } from '../../../types/resume';
import type { CustomOptions, LayoutProps, ThemeColors, PageMarginsMm, StyleId } from '../resumeTypes';
import { ClassicLayout } from '../layouts/ClassicLayout';
import { ModernLayout } from '../layouts/ModernLayout';
import { ExecutiveLayout } from '../layouts/ExecutiveLayout';
import { MinimalLayout } from '../layouts/MinimalLayout';
import { ElegantLayout } from '../layouts/ElegantLayout';
import { AcademicLayout } from '../layouts/AcademicLayout';
import { SplitLayout } from '../layouts/SplitLayout';
import { TimelineLayout } from '../layouts/TimelineLayout';
import { CustomLayout } from '../layouts/CustomLayout';

// Options used for Custom-style thumbnails when the caller doesn't supply its own.
const THUMBNAIL_CUSTOM: CustomOptions = {
  header: 'split', experience: 'list', skillsColumns: 2,
  sectionStyle: 'bar', skillsStyle: 'tags',
  education: 'standard', summary: 'paragraph',
};

/** Defaults for the Custom style in the editor. */
export const DEFAULT_CUSTOM_OPTIONS: CustomOptions = {
  header: 'split', experience: 'timeline', skillsColumns: 1,
  sectionStyle: 'bar', skillsStyle: 'list',
  education: 'standard', summary: 'paragraph',
};

const LAYOUT_MAP: Record<Exclude<StyleId, 'custom'>, React.ComponentType<LayoutProps>> = {
  classic: ClassicLayout,
  modern: ModernLayout,
  executive: ExecutiveLayout,
  minimal: MinimalLayout,
  elegant: ElegantLayout,
  academic: AcademicLayout,
  split: SplitLayout,
  timeline: TimelineLayout,
};

export function TemplatePreview({ resume, styleId, theme, pageMarginsMm, backgroundColor, fullNameColor, customOptions }: {
  resume: Resume;
  styleId: string;
  theme: ThemeColors;
  pageMarginsMm?: PageMarginsMm;
  backgroundColor?: string;
  fullNameColor?: string;
  customOptions?: CustomOptions;
}) {
  if (styleId === 'custom') {
    return (
      <CustomLayout
        r={resume}
        theme={theme}
        pageMarginsMm={pageMarginsMm}
        backgroundColor={backgroundColor}
        fullNameColor={fullNameColor}
        options={customOptions ?? THUMBNAIL_CUSTOM}
      />
    );
  }

  const Layout = LAYOUT_MAP[styleId as keyof typeof LAYOUT_MAP] ?? ClassicLayout;
  return (
    <Layout
      r={resume}
      theme={theme}
      pageMarginsMm={pageMarginsMm}
      backgroundColor={backgroundColor}
      fullNameColor={fullNameColor}
    />
  );
}
