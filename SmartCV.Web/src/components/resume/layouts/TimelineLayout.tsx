import type { LayoutProps, ThemeColors } from '../resumeTypes';
import { ContactRow, contactItems, dateRange, EduEntry, CertList, LangList, HighlightList, AchievementRows, InterestsList, RefereesBlock } from '../resumeShared';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function TimelineLayout({ r, theme }: LayoutProps) {
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        return summary ? (
          <TimelineSection key="summary" title="Summary" theme={theme}>
            <p style={{ textAlign: 'justify', color: '#374151', whiteSpace: 'pre-wrap' }}>{summary}</p>
          </TimelineSection>
        ) : null;
      case 'coreHighlights':
        return coreHighlights?.length > 0 ? (
          <TimelineSection key="coreHighlights" title="Core Highlights" theme={theme}>
            <ul style={{ paddingLeft: '16px', margin: 0 }}>
              {coreHighlights.filter(h => h.text).map(h => (
                <li key={h.id} style={{ marginBottom: '3px', color: '#374151' }}>{h.text}</li>
              ))}
            </ul>
          </TimelineSection>
        ) : null;
      case 'skills':
        return skills.length > 0 ? (
          <TimelineSection key="skills" title="Professional Skills" theme={theme}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {skills.map(s => (
                <div key={s.id}>
                  <span style={{ fontWeight: 600 }}>{s.category}: </span>
                  <span style={{ color: '#374151' }}>{s.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </TimelineSection>
        ) : null;
      case 'experience':
        return experience.length > 0 ? (
          <TimelineSection key="experience" title="Work Experience" theme={theme}>
            {experience.map((exp, idx) => (
              <div key={exp.id} style={{ display: 'flex', gap: '0' }}>
                <div style={{ width: '112px', flexShrink: 0, paddingTop: '3px' }}>
                  {(() => {
                    const range = dateRange(exp.startDate, exp.endDate, exp.current);
                    const [start, end] = range.includes('–') ? range.split('–').map(s => s.trim()) : [range, ''];
                    return (
                      <div style={{ fontSize: '8pt', fontWeight: 600, color: theme.dark, lineHeight: 1.3 }}>{start} - {end}</div>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '20px' }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                    background: theme.main, border: '2px solid white',
                    boxShadow: `0 0 0 2px ${theme.main}`, marginTop: '4px',
                  }} />
                  {idx < experience.length - 1 && (
                    <div style={{ flex: 1, width: '2px', background: theme.light, minHeight: '20px' }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingLeft: '10px', paddingBottom: '16px' }}>
                  <div style={{ fontWeight: 700 }}>{exp.position}</div>
                  {exp.company && <span style={{ color: theme.dark, fontWeight: 500 }}>{exp.company}</span>}
                  {exp.location && <span style={{ color: '#6b7280', fontSize: '9pt' }}>{exp.company ? ' · ' : ''}{exp.location}</span>}
                  {exp.description && <p style={{ marginTop: '4px', color: '#374151', fontSize: '9.5pt', whiteSpace: 'pre-wrap' }}>{exp.description}</p>}
                  <HighlightList highlights={exp.highlights} color="#374151" fontSize="9.5pt" />
                </div>
              </div>
            ))}
          </TimelineSection>
        ) : null;
      case 'education':
        return education.length > 0 ? (
          <TimelineSection key="education" title="Education" theme={theme}>
            {education.map(edu => (
              <EduEntry key={edu.id} edu={edu}
                accentColor={theme.main} dateColor="#6b7280" gpaColor="#4b5563" />
            ))}
          </TimelineSection>
        ) : null;
      case 'projects':
        return projects.length > 0 ? (
          <TimelineSection key="projects" title="Projects" theme={theme}>
            {projects.map(p => (
              <div key={p.id} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  {p.technologies.length > 0 && (
                    <span style={{ fontSize: '9pt', color: '#6b7280' }}>({p.technologies.join(', ')})</span>
                  )}
                </div>
                <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{p.description}</p>
                <HighlightList highlights={p.highlights ?? []} color="#374151" />
              </div>
            ))}
          </TimelineSection>
        ) : null;
      case 'certifications':
        return certifications.length > 0 ? (
          <TimelineSection key="certifications" title="Certifications" theme={theme}>
            <CertList items={certifications} dateColor="#6b7280" />
          </TimelineSection>
        ) : null;
      case 'languages':
        return languages.length > 0 ? (
          <TimelineSection key="languages" title="Languages" theme={theme}>
            <LangList items={languages} />
          </TimelineSection>
        ) : null;
      case 'achievements':
        return (r.achievements ?? []).filter(a => a.title).length > 0 ? (
          <TimelineSection key="achievements" title="Achievements" theme={theme}>
            <AchievementRows achievements={r.achievements} accent={theme.main} />
          </TimelineSection>
        ) : null;
      case 'interests':
        return (r.interests ?? []).filter(i => i.name).length > 0 ? (
          <TimelineSection key="interests" title="Interests" theme={theme}>
            <p style={{ color: '#374151' }}><InterestsList r={r} /></p>
          </TimelineSection>
        ) : null;
      case 'referees':
        return (r.referees?.length ?? 0) > 0 ? (
          <TimelineSection key="referees" title="Referees" theme={theme}>
            <RefereesBlock r={r} />
          </TimelineSection>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '14mm 14mm', fontFamily: 'Calibri, Arial, Helvetica, "Times New Roman", sans-serif', fontSize: '10.5pt', lineHeight: '1.45', color: '#1a1a1a' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 800, color: theme.dark, letterSpacing: '-0.02em', marginBottom: '3px' }}>
          {p.fullName || 'Your Name'}
        </h1>
        {p.title && <p style={{ fontSize: '12pt', color: theme.main, fontWeight: 500, marginBottom: '6px' }}>{p.title}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '9.5pt', color: '#4b5563' }}>
          <ContactRow items={contactItems(p)} />
        </div>
      </div>
      {sectionOrder.map(key => renderSection(key))}
    </div>
  );
}

function TimelineSection({ title, theme, children }: { title: string; theme: ThemeColors; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '10.5pt', fontWeight: 700, color: theme.dark,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: `2px solid ${theme.main}`, paddingBottom: '3px', marginBottom: '10px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
