import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps, type ThemeColors } from '../resumeTypes';
import { ContactRow, contactItems, dateRange, EduEntry, HighlightList, ProjectTechnologies, ExperienceProjectRows } from '../resumeShared';
import { RichTextContent } from '../RichText';
import { ResumeSections, simpleSectionBodies, visibleHighlights, type SectionBodies } from './ResumeSections';

export function TimelineLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, experience, education, skills, projects } = r;

  const bodies: SectionBodies = {
    summary: () => <RichTextContent html={summary} style={{ textAlign: 'justify', color: '#374151', whiteSpace: 'pre-wrap' }} />,
    coreHighlights: () => (
      <ul style={{ paddingLeft: '16px', margin: 0, listStyleType: 'disc' }}>
        {visibleHighlights(r).map(h => (
          <li key={h.id} style={{ marginBottom: '3px', color: '#374151', fontSize: '11pt' }}><RichTextContent html={h.text} /></li>
        ))}
      </ul>
    ),
    skills: () => (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
        {skills.map(s => (
          <div key={s.id}>
            <span style={{ fontWeight: 600 }}>{s.category}: </span>
            <span style={{ color: '#374151' }}>{s.items.join(', ')}</span>
          </div>
        ))}
      </div>
    ),
    experience: () => (
      <>
        {experience.map((exp, idx) => (
          <div key={exp.id} style={{ display: 'flex', gap: '0' }}>
            <div style={{ width: '112px', flexShrink: 0, paddingTop: '3px' }}>
              {(() => {
                const range = dateRange(exp.startDate, exp.endDate, exp.current, t('resumeLayout.present'));
                const [start, end] = range.includes('–') ? range.split('–').map(s => s.trim()) : [range, ''];
                return (
                  <div style={{ fontSize: '10pt', fontWeight: 600, color: theme.dark, lineHeight: 1.3 }}>{start} - {end}</div>
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
              <div>
                <span style={{ fontWeight: 700 }}>{exp.position}</span>
                {exp.company && <span style={{ color: theme.dark, fontWeight: 500 }}>{exp.position ? ' · ' : ''}{exp.company}</span>}
                {exp.location && <span style={{ color: '#6b7280', fontSize: '9pt' }}>{(exp.position || exp.company) ? ' · ' : ''}{exp.location}</span>}
              </div>
              {exp.description && <RichTextContent html={exp.description} style={{ marginTop: '4px', color: '#374151', fontSize: '10pt', whiteSpace: 'pre-wrap' }} />}
              <ExperienceProjectRows projects={exp.projects} color="#374151" />
              {(exp.productLinks ?? []).filter(Boolean).length > 0 && (
                <p style={{ marginTop: '3px', fontSize: '9pt', color: '#374151', overflowWrap: 'anywhere' }}>
                  <strong>Product:</strong> {(exp.productLinks ?? []).filter(Boolean).join(' · ')}
                </p>
              )}
              <HighlightList highlights={exp.highlights} color="#374151" fontSize="10pt" />
            </div>
          </div>
        ))}
      </>
    ),
    education: () => (
      <>
        {education.map(edu => (
          <EduEntry key={edu.id} edu={edu}
            accentColor={theme.main} dateColor="#6b7280" gpaColor="#4b5563" />
        ))}
      </>
    ),
    projects: () => (
      <>
        {projects.map(p => (
          <div key={p.id} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontWeight: 700 }}>{p.name}</span>
            </div>
            <RichTextContent html={p.description} style={{ color: '#374151', whiteSpace: 'pre-wrap', fontSize: '11pt' }} />
            <HighlightList highlights={p.highlights ?? []} color="#374151" fontSize="11pt" />
            <ProjectTechnologies project={p} color="#374151" />
          </div>
        ))}
      </>
    ),
    ...simpleSectionBodies(r, { accent: theme.main, cert: { dateColor: '#6b7280' } }),
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5pt', lineHeight: '1.45', color: '#1a1a1a' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 800, color: theme.dark, letterSpacing: '-0.02em', marginBottom: '3px' }}>
          {p.fullName || 'Your Name'}
        </h1>
        {p.title && <p style={{ fontSize: '12pt', color: theme.main, fontWeight: 500, marginBottom: '6px' }}>{p.title}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '9.5pt', color: '#4b5563' }}>
          <ContactRow items={contactItems(p)} />
        </div>
      </div>
      <ResumeSections r={r} bodies={bodies} renderSection={(title, body) => <TimelineSection title={title} theme={theme}>{body}</TimelineSection>} />
    </div>
  );
}

function TimelineSection({ title, theme, children }: { title: string; theme: ThemeColors; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '11.5pt', fontWeight: 700, color: theme.dark,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: `2px solid ${theme.main}`, paddingBottom: '3px', marginBottom: '10px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
