import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Resume, ResumeSection } from '../../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';
import { isRichTextEmpty } from '../../../lib/richText';
import { AchievementRows, CertList, InterestsList, LangList, RefereesBlock, sectionTitle } from '../resumeShared';

/** A layout supplies one renderer per section body; the frame and ordering are shared. */
export type SectionBodies = Partial<Record<ResumeSection, () => ReactNode>>;

export const visibleHighlights = (r: Resume) => (r.coreHighlights ?? []).filter(h => !isRichTextEmpty(h.text));

/** Whether a section has anything to show. One definition for every layout. */
export function hasSectionContent(r: Resume, key: ResumeSection): boolean {
  switch (key) {
    case 'summary': return !isRichTextEmpty(r.summary ?? '');
    case 'coreHighlights': return visibleHighlights(r).length > 0;
    case 'experience': return r.experience.length > 0;
    case 'education': return r.education.length > 0;
    case 'skills': return r.skills.length > 0;
    case 'projects': return r.projects.length > 0;
    case 'certifications': return r.certifications.length > 0;
    case 'languages': return r.languages.length > 0;
    case 'achievements': return (r.achievements ?? []).some(a => a.title);
    case 'interests': return (r.interests ?? []).some(i => i.name);
    case 'referees': return (r.referees?.length ?? 0) > 0;
    default: return false;
  }
}

/**
 * Render the resume's sections in the user's order, skipping empty ones. Each layout
 * provides its section frame (`renderSection`) and the bodies it styles itself.
 */
export function ResumeSections({ r, bodies, renderSection, titleKeys }: {
  r: Resume;
  bodies: SectionBodies;
  renderSection: (title: string, body: ReactNode, key: ResumeSection) => ReactNode;
  /** i18n key overrides under resumeLayout.sections (e.g. a layout-specific heading). */
  titleKeys?: Partial<Record<ResumeSection, string>>;
}) {
  const { t } = useTranslation();
  return (
    <>
      {(r.sectionOrder ?? DEFAULT_SECTION_ORDER).map(key => {
        const body = bodies[key];
        if (!body || !hasSectionContent(r, key)) return null;
        const title = sectionTitle(r, key, t(`resumeLayout.sections.${titleKeys?.[key] ?? key}`));
        return <Fragment key={key}>{renderSection(title, body(), key)}</Fragment>;
      })}
    </>
  );
}

export interface SimpleSectionStyle {
  accent: string;
  /** Interests text colour. */
  text?: string;
  cert: Omit<Parameters<typeof CertList>[0], 'items'>;
  lang?: Omit<Parameters<typeof LangList>[0], 'items'>;
}

/** Certifications, languages, achievements, interests and referees render the same way in every layout bar a few colours. */
export function simpleSectionBodies(r: Resume, style: SimpleSectionStyle): SectionBodies {
  return {
    certifications: () => <CertList items={r.certifications} {...style.cert} />,
    languages: () => <LangList items={r.languages} {...style.lang} />,
    achievements: () => <AchievementRows achievements={r.achievements} accent={style.accent} />,
    interests: () => <p style={{ color: style.text ?? '#374151' }}><InterestsList r={r} /></p>,
    referees: () => <RefereesBlock r={r} />,
  };
}
