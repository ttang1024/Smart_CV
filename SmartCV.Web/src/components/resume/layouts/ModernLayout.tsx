import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, CertList, LangList, HighlightList, AchievementRows, InterestsList, RefereesBlock, sectionTitle } from '../resumeShared';
import { isRichTextEmpty } from '../../../lib/richText';
import { RichTextContent } from '../RichText';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function ModernLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const accent = theme.main;
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        return summary ? (
          <ModernSection key="summary" title={sectionTitle(r, 'summary', t('resumeLayout.sections.summary'))} accent={accent}>
            <RichTextContent html={summary} style={{ color: '#374151', textAlign: 'justify', whiteSpace: 'pre-wrap' }} />
          </ModernSection>
        ) : null;
      case 'coreHighlights':
        return coreHighlights?.length > 0 ? (
          <ModernSection key="coreHighlights" title={sectionTitle(r, 'coreHighlights', t('resumeLayout.sections.coreHighlights'))} accent={accent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {coreHighlights.filter(h => !isRichTextEmpty(h.text)).map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: accent, fontWeight: 700, fontSize: '13pt', lineHeight: '1.1', flexShrink: 0 }}>›</span>
                  <span style={{ color: '#374151' }}><RichTextContent html={h.text} /></span>
                </div>
              ))}
            </div>
          </ModernSection>
        ) : null;
      case 'experience':
        return experience.length > 0 ? (
          <ModernSection key="experience" title={sectionTitle(r, 'experience', t('resumeLayout.sections.experience'))} accent={accent}>
            {experience.map(exp => (
              <ExpEntry key={exp.id} exp={exp}
                companyColor={accent} companyWeight={500}
                locColor="#9ca3af" locFontSize="9pt"
                dateColor="#9ca3af" dateBadge descColor="#4b5563"
                positionFontSize="11pt" />
            ))}
          </ModernSection>
        ) : null;
      case 'education':
        return education.length > 0 ? (
          <ModernSection key="education" title={sectionTitle(r, 'education', t('resumeLayout.sections.education'))} accent={accent}>
            {education.map(edu => (
              <EduEntry key={edu.id} edu={edu}
                accentColor={accent} dateColor="#9ca3af" gpaColor="#6b7280" />
            ))}
          </ModernSection>
        ) : null;
      case 'skills':
        return skills.length > 0 ? (
          <ModernSection key="skills" title={sectionTitle(r, 'skills', t('resumeLayout.sections.skills'))} accent={accent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {skills.map(s => (
                <div key={s.id} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600, color: accent, minWidth: '80px', fontSize: '9.5pt' }}>{s.category}</span>
                  <span style={{ color: '#374151' }}>{s.items.join(' · ')}</span>
                </div>
              ))}
            </div>
          </ModernSection>
        ) : null;
      case 'projects':
        return projects.length > 0 ? (
          <ModernSection key="projects" title={sectionTitle(r, 'projects', t('resumeLayout.sections.projects'))} accent={accent}>
            {projects.map(p => (
              <div key={p.id} style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                {p.technologies.length > 0 && (
                  <span style={{ fontSize: '9pt', color: '#9ca3af', marginLeft: '6px' }}>[{p.technologies.join(', ')}]</span>
                )}
                <RichTextContent html={p.description} style={{ color: '#4b5563', marginTop: '2px', whiteSpace: 'pre-wrap' }} />
                <HighlightList highlights={p.highlights ?? []} color="#4b5563" />
              </div>
            ))}
          </ModernSection>
        ) : null;
      case 'certifications':
        return certifications.length > 0 ? (
          <ModernSection key="certifications" title={sectionTitle(r, 'certifications', t('resumeLayout.sections.certifications'))} accent={accent}>
            <CertList items={certifications} dateColor="#9ca3af" />
          </ModernSection>
        ) : null;
      case 'languages':
        return languages.length > 0 ? (
          <ModernSection key="languages" title={sectionTitle(r, 'languages', t('resumeLayout.sections.languages'))} accent={accent}>
            <LangList items={languages} gap="8px 20px" profColor="#9ca3af" />
          </ModernSection>
        ) : null;
      case 'achievements':
        return (r.achievements ?? []).filter(a => a.title).length > 0 ? (
          <ModernSection key="achievements" title={sectionTitle(r, 'achievements', t('resumeLayout.sections.achievements'))} accent={accent}>
            <AchievementRows achievements={r.achievements} accent={accent} />
          </ModernSection>
        ) : null;
      case 'interests':
        return (r.interests ?? []).filter(i => i.name).length > 0 ? (
          <ModernSection key="interests" title={sectionTitle(r, 'interests', t('resumeLayout.sections.interests'))} accent={accent}>
            <p style={{ color: '#374151' }}><InterestsList r={r} /></p>
          </ModernSection>
        ) : null;
      case 'referees':
        return (r.referees?.length ?? 0) > 0 ? (
          <ModernSection key="referees" title={sectionTitle(r, 'referees', t('resumeLayout.sections.referees'))} accent={accent}>
            <RefereesBlock r={r} />
          </ModernSection>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Calibri, Arial, Helvetica, "Times New Roman", sans-serif', fontSize: '10.5pt', lineHeight: '1.45', color: '#111827' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '2px' }}>
          {p.fullName || 'Your Name'}
        </h1>
        {p.title && (
          <p style={{ fontSize: '12pt', fontWeight: 500, color: accent, marginBottom: '8px' }}>{p.title}</p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', fontSize: '9pt', color: '#6b7280' }}>
          <ContactRow items={contactItems(p)} />
        </div>
        <div style={{ marginTop: '10px', height: '3px', background: `linear-gradient(90deg, ${accent}, ${theme.light}, transparent)`, borderRadius: '2px' }} />
      </div>
      {sectionOrder.map(key => renderSection(key))}
    </div>
  );
}

function ModernSection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{ width: '4px', height: '18px', background: accent, borderRadius: '2px', flexShrink: 0 }} />
        <h2 style={{ fontSize: '11pt', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
