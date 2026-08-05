import type { Resume } from '../../../types/resume';
import type { CustomOptions, LayoutProps, ThemeColors, PageMarginsMm } from '../resumeTypes';
import { ClassicLayout } from '../layouts/ClassicLayout';
import { ModernLayout } from '../layouts/ModernLayout';
import { ExecutiveLayout } from '../layouts/ExecutiveLayout';
import { MinimalLayout } from '../layouts/MinimalLayout';
import { ElegantLayout } from '../layouts/ElegantLayout';
import { AcademicLayout } from '../layouts/AcademicLayout';
import { SplitLayout } from '../layouts/SplitLayout';
import { TimelineLayout } from '../layouts/TimelineLayout';
import { CustomLayout } from '../layouts/CustomLayout';

const DEFAULT_CUSTOM: CustomOptions = {
  header: 'split', experience: 'list', skillsColumns: 2,
  sectionStyle: 'bar', skillsStyle: 'tags',
  education: 'standard', summary: 'paragraph',
};

function CustomPreview(props: LayoutProps) {
  return <CustomLayout {...props} options={DEFAULT_CUSTOM} />;
}

const LAYOUT_MAP: Record<string, React.ComponentType<LayoutProps>> = {
  classic: ClassicLayout,
  modern: ModernLayout,
  executive: ExecutiveLayout,
  minimal: MinimalLayout,
  elegant: ElegantLayout,
  academic: AcademicLayout,
  split: SplitLayout,
  timeline: TimelineLayout,
  custom: CustomPreview,
};

export function TemplatePreview({ resume, styleId, theme, pageMarginsMm, backgroundColor, fullNameColor }: {
  resume: Resume;
  styleId: string;
  theme: ThemeColors;
  pageMarginsMm?: PageMarginsMm;
  backgroundColor?: string;
  fullNameColor?: string;
}) {
  const Layout = LAYOUT_MAP[styleId] ?? ClassicLayout;
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
