import type { LayoutProps } from '../resumeTypes';
import { contactItems, HighlightList, AchievementRows, InterestsList, RefereesBlock, dateRange } from '../resumeShared';

export function CreativeLayout({ r, theme }: LayoutProps) {
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const sidebarBg = theme.dark;
  const accent = theme.main;

  return (
    <div style={{ display: 'flex', minHeight: '297mm', fontFamily: 'Calibri, Arial, Helvetica, "Times New Roman", sans-serif', fontSize: '10.5pt', lineHeight: '1.45' }}>
      {/* Sidebar */}
      <div style={{ width: '68mm', background: sidebarBg, color: '#e2e8f0', padding: '14mm 7mm', flexShrink: 0 }}>
        <div style={{ marginBottom: '14px', borderBottom: `2px solid ${accent}`, paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '14pt', fontWeight: 700, color: '#ffffff', lineHeight: 1.2, marginBottom: '4px' }}>
            {p.fullName || 'Your Name'}
          </h1>
          {p.title && (
            <p style={{ fontSize: '9pt', color: accent, fontWeight: 500, letterSpacing: '0.04em' }}>{p.title}</p>
          )}
        </div>

        <SidebarSection title="Contact" accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '8.5pt', color: '#94a3b8' }}>
            {contactItems(p).map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {item.icon}{item.text}
              </span>
            ))}
          </div>
        </SidebarSection>

        {skills.length > 0 && (
          <SidebarSection title="Professional Skills" accent={accent}>
            {skills.map(s => (
              <div key={s.id} style={{ marginBottom: '5px' }}>
                <div style={{ fontSize: '8.5pt', fontWeight: 600, color: accent, marginBottom: '2px' }}>{s.category}</div>
                <div style={{ fontSize: '8.5pt', color: '#94a3b8' }}>{s.items.join(', ')}</div>
              </div>
            ))}
          </SidebarSection>
        )}

        {education.length > 0 && (
          <SidebarSection title="Education" accent={accent}>
            {education.map(edu => (
              <div key={edu.id} style={{ marginBottom: '8px', fontSize: '8.5pt' }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</div>
                {edu.institution && <div style={{ color: '#94a3b8' }}>{edu.institution}</div>}
                <div style={{ color: '#64748b', marginTop: '1px' }}>
                  {dateRange(edu.startDate, edu.endDate, edu.current)}
                </div>
              </div>
            ))}
          </SidebarSection>
        )}

        {languages.length > 0 && (
          <SidebarSection title="Languages" accent={accent}>
            {languages.map(l => (
              <div key={l.id} style={{ fontSize: '8.5pt', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{l.language}</span>
                <span style={{ color: '#94a3b8' }}> — {l.proficiency}</span>
              </div>
            ))}
          </SidebarSection>
        )}

        {certifications.length > 0 && (
          <SidebarSection title="Certifications" accent={accent}>
            {certifications.map(c => (
              <div key={c.id} style={{ marginBottom: '5px', fontSize: '8.5pt' }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{c.name}</div>
                <div style={{ color: '#94a3b8' }}>{c.issuer}</div>
                {c.date && <div style={{ color: '#64748b' }}>{c.date}</div>}
              </div>
            ))}
          </SidebarSection>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '14mm 10mm', color: '#1e293b' }}>
        {summary && (
          <CreativeSection title="Summary" accent={accent}>
            <p style={{ color: '#475569', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{summary}</p>
          </CreativeSection>
        )}

        {coreHighlights?.length > 0 && (
          <CreativeSection title="Core Highlights" accent={accent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {coreHighlights.filter(h => h.text).map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: accent, fontWeight: 700, fontSize: '12pt', lineHeight: '1.1', flexShrink: 0 }}>·</span>
                  <span style={{ color: '#475569' }}>{h.text}</span>
                </div>
              ))}
            </div>
          </CreativeSection>
        )}

        {experience.length > 0 && (
          <CreativeSection title="Work Experience" accent={accent}>
            {experience.map(exp => (
              <div key={exp.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '11pt', color: '#0f172a' }}>{exp.position}</span>
                    {exp.company && <span style={{ color: '#64748b', fontWeight: 500 }}>{exp.position ? ' · ' : ''}{exp.company}</span>}
                  </div>
                  <span style={{ fontSize: '8.5pt', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {dateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                {exp.location && <div style={{ fontSize: '9pt', color: '#94a3b8', marginTop: '1px' }}>{exp.location}</div>}
                {exp.description && <p style={{ marginTop: '4px', color: '#475569', whiteSpace: 'pre-wrap' }}>{exp.description}</p>}
                <HighlightList highlights={exp.highlights} color="#475569" dotColor={accent} fontSize="10pt" />
              </div>
            ))}
          </CreativeSection>
        )}

        {projects.length > 0 && (
          <CreativeSection title="Projects" accent={accent}>
            {projects.map(p => (
              <div key={p.id} style={{ marginBottom: '9px' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                {p.technologies.length > 0 && (
                  <span style={{ fontSize: '8.5pt', color: '#94a3b8', marginLeft: '6px' }}>{p.technologies.join(', ')}</span>
                )}
                <p style={{ color: '#475569', marginTop: '2px', whiteSpace: 'pre-wrap' }}>{p.description}</p>
                <HighlightList highlights={p.highlights ?? []} color="#475569" />
              </div>
            ))}
          </CreativeSection>
        )}

        {(r.achievements ?? []).filter(a => a.title).length > 0 && (
          <CreativeSection title="Achievements" accent={accent}>
            <AchievementRows achievements={r.achievements} accent={accent} />
          </CreativeSection>
        )}

        {(r.interests ?? []).filter(i => i.name).length > 0 && (
          <CreativeSection title="Interests" accent={accent}>
            <p style={{ color: '#475569' }}><InterestsList r={r} /></p>
          </CreativeSection>
        )}

        {(r.referees?.length ?? 0) > 0 && (
          <CreativeSection title="Referees" accent={accent}>
            <RefereesBlock r={r} />
          </CreativeSection>
        )}
      </div>
    </div>
  );
}

function SidebarSection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '8pt', fontWeight: 700, color: accent,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        marginBottom: '6px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function CreativeSection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '11pt', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {title}
        </h2>
        <div style={{ flex: 1, height: '1px', background: accent, opacity: 0.4 }} />
      </div>
      {children}
    </div>
  );
}
