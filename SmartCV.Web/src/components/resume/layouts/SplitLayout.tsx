import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps, type ThemeColors } from '../resumeTypes';
import { contactItems, ExpEntry, EduEntry, CertList, LangList, HighlightList, AchievementRows, InterestsList, RefereesBlock, sectionTitle } from '../resumeShared';
import { isRichTextEmpty } from '../../../lib/richText';
import { RichTextContent } from '../RichText';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function SplitLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const contactLines = contactItems(p);
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        return summary ? (
          <SplitSection key="summary" title={sectionTitle(r, 'summary', t('resumeLayout.sections.summary'))} theme={theme}>
            <RichTextContent html={summary} style={{ textAlign: 'justify', whiteSpace: 'pre-wrap' }} />
          </SplitSection>
        ) : null;
      case 'coreHighlights':
        return coreHighlights?.length > 0 ? (
          <SplitSection key="coreHighlights" title={sectionTitle(r, 'coreHighlights', t('resumeLayout.sections.coreHighlights'))} theme={theme}>
            <ul style={{ paddingLeft: '16px', margin: 0 }}>
              {coreHighlights.filter(h => !isRichTextEmpty(h.text)).map(h => (
                <li key={h.id} style={{ marginBottom: '3px', color: '#374151' }}><RichTextContent html={h.text} /></li>
              ))}
            </ul>
          </SplitSection>
        ) : null;
      case 'skills':
        return skills.length > 0 ? (
          <SplitSection key="skills" title={sectionTitle(r, 'skills', t('resumeLayout.sections.skills'))} theme={theme}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {skills.map(s => (
                <div key={s.id}>
                  <span style={{ fontWeight: 600 }}>{s.category}: </span>
                  <span style={{ color: '#374151' }}>{s.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </SplitSection>
        ) : null;
      case 'experience':
        return experience.length > 0 ? (
          <SplitSection key="experience" title={sectionTitle(r, 'experience', t('resumeLayout.sections.experience'))} theme={theme}>
            {experience.map(exp => (
              <ExpEntry key={exp.id} exp={exp}
                companyColor={theme.main} companySep=" · "
                locColor="#6b7280" locFontSize="9.5pt"
                dateColor="#6b7280" descColor="#374151"
                descMt="3px" mb="10px" />
            ))}
          </SplitSection>
        ) : null;
      case 'education':
        return education.length > 0 ? (
          <SplitSection key="education" title={sectionTitle(r, 'education', t('resumeLayout.sections.education'))} theme={theme}>
            {education.map(edu => (
              <EduEntry key={edu.id} edu={edu}
                accentColor={theme.main} dateColor="#6b7280" gpaColor="#4b5563" />
            ))}
          </SplitSection>
        ) : null;
      case 'projects':
        return projects.length > 0 ? (
          <SplitSection key="projects" title={sectionTitle(r, 'projects', t('resumeLayout.sections.projects'))} theme={theme}>
            {projects.map(p => (
              <div key={p.id} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  {p.technologies.length > 0 && (
                    <span style={{ fontSize: '9pt', color: '#6b7280' }}>({p.technologies.join(', ')})</span>
                  )}
                </div>
                <RichTextContent html={p.description} style={{ color: '#374151', whiteSpace: 'pre-wrap' }} />
                <HighlightList highlights={p.highlights ?? []} color="#374151" />
              </div>
            ))}
          </SplitSection>
        ) : null;
      case 'certifications':
        return certifications.length > 0 ? (
          <SplitSection key="certifications" title={sectionTitle(r, 'certifications', t('resumeLayout.sections.certifications'))} theme={theme}>
            <CertList items={certifications} dateColor="#6b7280" />
          </SplitSection>
        ) : null;
      case 'languages':
        return languages.length > 0 ? (
          <SplitSection key="languages" title={sectionTitle(r, 'languages', t('resumeLayout.sections.languages'))} theme={theme}>
            <LangList items={languages} />
          </SplitSection>
        ) : null;
      case 'achievements':
        return (r.achievements ?? []).filter(a => a.title).length > 0 ? (
          <SplitSection key="achievements" title={sectionTitle(r, 'achievements', t('resumeLayout.sections.achievements'))} theme={theme}>
            <AchievementRows achievements={r.achievements} accent={theme.main} />
          </SplitSection>
        ) : null;
      case 'interests':
        return (r.interests ?? []).filter(i => i.name).length > 0 ? (
          <SplitSection key="interests" title={sectionTitle(r, 'interests', t('resumeLayout.sections.interests'))} theme={theme}>
            <p style={{ color: '#374151' }}><InterestsList r={r} /></p>
          </SplitSection>
        ) : null;
      case 'referees':
        return (r.referees?.length ?? 0) > 0 ? (
          <SplitSection key="referees" title={sectionTitle(r, 'referees', t('resumeLayout.sections.referees'))} theme={theme}>
            <RefereesBlock r={r} />
          </SplitSection>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Calibri, Arial, Helvetica, "Times New Roman", sans-serif', fontSize: '10.5pt', lineHeight: '1.45', color: '#1a1a1a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `3px solid ${theme.main}`, paddingBottom: '10px', marginBottom: '14px' }}>
        <div>
          <h1 style={{ fontSize: '26pt', fontWeight: 800, color: theme.dark, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '3px' }}>
            {p.fullName || 'Your Name'}
          </h1>
          {p.title && <p style={{ fontSize: '12pt', color: theme.main, fontWeight: 500 }}>{p.title}</p>}
        </div>
        <div style={{ fontSize: '9pt', color: '#4b5563', lineHeight: '1.7' }}>
          {contactLines.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {item.icon}{item.text}
            </div>
          ))}
        </div>
      </div>
      {sectionOrder.map(key => renderSection(key))}
    </div>
  );
}

function SplitSection({ title, theme, children }: { title: string; theme: ThemeColors; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <h2 style={{
        fontSize: '10.5pt', fontWeight: 700, color: theme.dark,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: `1px solid ${theme.light}`, paddingBottom: '3px', marginBottom: '8px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
