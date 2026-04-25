import { useTranslation } from 'react-i18next';
import type { LayoutProps, ThemeColors } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, CertList, LangList, HighlightList, AchievementRows, InterestsList, RefereesBlock } from '../resumeShared';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function MinimalLayout({ r, theme }: LayoutProps) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        return summary ? (
          <MinimalSection key="summary" title={t('resumeLayout.sections.summary')} theme={theme}>
            <p style={{ color: '#444444', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{summary}</p>
          </MinimalSection>
        ) : null;
      case 'coreHighlights':
        return coreHighlights?.length > 0 ? (
          <MinimalSection key="coreHighlights" title={t('resumeLayout.sections.highlightsMinimal')} theme={theme}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {coreHighlights.filter(h => h.text).map(h => (
                <div key={h.id} style={{ color: '#444444', paddingLeft: '12px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#aaaaaa' }}>—</span>
                  {h.text}
                </div>
              ))}
            </div>
          </MinimalSection>
        ) : null;
      case 'skills':
        return skills.length > 0 ? (
          <MinimalSection key="skills" title={t('resumeLayout.sections.skills')} theme={theme}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {skills.map(s => (
                <div key={s.id}>
                  <span style={{ fontWeight: 600, color: '#333333' }}>{s.category} </span>
                  <span style={{ color: '#666666' }}>— {s.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </MinimalSection>
        ) : null;
      case 'experience':
        return experience.length > 0 ? (
          <MinimalSection key="experience" title={t('resumeLayout.sections.experience')} theme={theme}>
            {experience.map(exp => (
              <ExpEntry key={exp.id} exp={exp}
                companyColor="#888888" locColor="#aaaaaa" locSep=", "
                dateColor="#aaaaaa" descColor="#555555"
                positionWeight={600} />
            ))}
          </MinimalSection>
        ) : null;
      case 'education':
        return education.length > 0 ? (
          <MinimalSection key="education" title={t('resumeLayout.sections.education')} theme={theme}>
            {education.map(edu => (
              <EduEntry key={edu.id} edu={edu}
                accentColor="#888888" instSep=", "
                dateColor="#aaaaaa" gpaColor="#888888" degreeWeight={600} />
            ))}
          </MinimalSection>
        ) : null;
      case 'projects':
        return projects.length > 0 ? (
          <MinimalSection key="projects" title={t('resumeLayout.sections.projects')} theme={theme}>
            {projects.map(p => (
              <div key={p.id} style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                {p.technologies.length > 0 && (
                  <span style={{ color: '#999999', fontSize: '9pt', marginLeft: '6px' }}>{p.technologies.join(', ')}</span>
                )}
                <p style={{ color: '#555555', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{p.description}</p>
                <HighlightList highlights={p.highlights ?? []} color="#555555" />
              </div>
            ))}
          </MinimalSection>
        ) : null;
      case 'certifications':
        return certifications.length > 0 ? (
          <MinimalSection key="certifications" title={t('resumeLayout.sections.certifications')} theme={theme}>
            <CertList items={certifications} dateColor="#aaaaaa" />
          </MinimalSection>
        ) : null;
      case 'languages':
        return languages.length > 0 ? (
          <MinimalSection key="languages" title={t('resumeLayout.sections.languages')} theme={theme}>
            <LangList items={languages} gap="8px 20px" color="#555555" />
          </MinimalSection>
        ) : null;
      case 'achievements':
        return (r.achievements ?? []).filter(a => a.title).length > 0 ? (
          <MinimalSection key="achievements" title={t('resumeLayout.sections.achievements')} theme={theme}>
            <AchievementRows achievements={r.achievements} accent={theme.main} />
          </MinimalSection>
        ) : null;
      case 'interests':
        return (r.interests ?? []).filter(i => i.name).length > 0 ? (
          <MinimalSection key="interests" title={t('resumeLayout.sections.interests')} theme={theme}>
            <p style={{ color: '#555555' }}><InterestsList r={r} /></p>
          </MinimalSection>
        ) : null;
      case 'referees':
        return (r.referees?.length ?? 0) > 0 ? (
          <MinimalSection key="referees" title={t('resumeLayout.sections.referees')} theme={theme}>
            <RefereesBlock r={r} />
          </MinimalSection>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '14mm 16mm', fontFamily: 'Calibri, Arial, Helvetica, "Times New Roman", sans-serif', fontSize: '10.5pt', lineHeight: '1.5', color: '#222222' }}>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20pt', fontWeight: 300, letterSpacing: '0.1em', color: '#111111', marginBottom: '2px' }}>
          {(p.fullName || 'Your Name').toUpperCase()}
        </h1>
        {p.title && (
          <p style={{ fontSize: '10.5pt', color: '#888888', fontWeight: 400, letterSpacing: '0.05em', marginBottom: '8px' }}>
            {p.title}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', fontSize: '9pt', color: '#888888' }}>
          <ContactRow items={contactItems(p)} />
        </div>
      </div>
      {sectionOrder.map(key => renderSection(key))}
    </div>
  );
}

function MinimalSection({ title, theme, children }: { title: string; theme: ThemeColors; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '8.5pt', fontWeight: 600, color: theme.main,
        textTransform: 'uppercase', letterSpacing: '0.14em',
        borderBottom: `1px dotted ${theme.light}`, paddingBottom: '4px', marginBottom: '8px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
