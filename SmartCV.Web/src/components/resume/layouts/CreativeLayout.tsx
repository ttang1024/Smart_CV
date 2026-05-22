import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps } from '../resumeTypes';
import { contactItems, HighlightList, AchievementRows, InterestsList, RefereesBlock, dateRange, ProjectTechnologies, sectionTitle } from '../resumeShared';
import { isRichTextEmpty } from '../../../lib/richText';
import { RichTextContent } from '../RichText';

export function CreativeLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM, backgroundColor = theme.dark, fullNameColor = '#ffffff' }: LayoutProps) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const sidebarBg = backgroundColor;
  const accent = theme.main;
  const presentLabel = t('resumeLayout.present');

  return (
    <div style={{ position: 'relative', fontFamily: 'Calibri, Arial, Helvetica, "Times New Roman", sans-serif', fontSize: '10.5pt', lineHeight: '1.45' }}>
      {/* Transparent spacer float — 78mm = 68mm sidebar + 10mm gap, matching original marginLeft+paddingLeft spacing */}
      <div style={{ float: 'left', width: '78mm', height: '297mm' }} />
      {/* Sidebar — absolutely positioned on top of the spacer; only covers page 1 visually */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '68mm', height: 'calc(297mm + 1px)', overflow: 'hidden', background: sidebarBg, color: '#e2e8f0', padding: `${pageMarginsMm.top}mm 7mm 0 ${pageMarginsMm.left}mm` }}>
        <div style={{ marginBottom: '14px', borderBottom: `2px solid ${accent}`, paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '14pt', fontWeight: 700, color: fullNameColor, lineHeight: 1.2, marginBottom: '4px' }}>
            {p.fullName || 'Your Name'}
          </h1>
          {p.title && (
            <p style={{ fontSize: '9pt', color: accent, fontWeight: 500, letterSpacing: '0.04em' }}>{p.title}</p>
          )}
        </div>

        <SidebarSection title={sectionTitle(r, 'personalInfo', t('resumeLayout.sections.contact'))} accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '8.5pt', color: '#94a3b8' }}>
            {contactItems(p).map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {item.icon}{item.text}
              </span>
            ))}
          </div>
        </SidebarSection>

        {skills.length > 0 && (
          <SidebarSection title={sectionTitle(r, 'skills', t('resumeLayout.sections.skills'))} accent={accent}>
            {skills.map(s => (
              <div key={s.id} style={{ marginBottom: '5px' }}>
                <div style={{ fontSize: '8.5pt', fontWeight: 600, color: accent, marginBottom: '2px' }}>{s.category}</div>
                <div style={{ fontSize: '8.5pt', color: '#94a3b8' }}>{s.items.join(', ')}</div>
              </div>
            ))}
          </SidebarSection>
        )}

        {education.length > 0 && (
          <SidebarSection title={sectionTitle(r, 'education', t('resumeLayout.sections.education'))} accent={accent}>
            {education.map(edu => (
              <div key={edu.id} style={{ marginBottom: '8px', fontSize: '8.5pt' }}>
                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{edu.degree}{edu.field ? ` - ${edu.field}` : ''}</div>
                {edu.institution && <div style={{ color: '#94a3b8' }}>{edu.institution}</div>}
                <div style={{ color: '#64748b', marginTop: '1px' }}>
                  {dateRange(edu.startDate, edu.endDate, edu.current, presentLabel)}
                </div>
              </div>
            ))}
          </SidebarSection>
        )}

        {languages.length > 0 && (
          <SidebarSection title={sectionTitle(r, 'languages', t('resumeLayout.sections.languages'))} accent={accent}>
            {languages.map(l => (
              <div key={l.id} style={{ fontSize: '8.5pt', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{l.language}</span>
                <span style={{ color: '#94a3b8' }}> — {l.proficiency}</span>
              </div>
            ))}
          </SidebarSection>
        )}

        {certifications.length > 0 && (
          <SidebarSection title={sectionTitle(r, 'certifications', t('resumeLayout.sections.certifications'))} accent={accent}>
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

      {/* Main content — text wraps right of the spacer float on page 1; fills full width on page 2+ */}
      <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm 10mm`, color: '#1e293b' }}>
        {summary && (
          <CreativeSection title={sectionTitle(r, 'summary', t('resumeLayout.sections.summary'))} accent={accent}>
            <RichTextContent html={summary} style={{ color: '#475569', textAlign: 'justify', whiteSpace: 'pre-wrap' }} />
          </CreativeSection>
        )}

        {coreHighlights?.length > 0 && (
          <CreativeSection title={sectionTitle(r, 'coreHighlights', t('resumeLayout.sections.coreHighlights'))} accent={accent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {coreHighlights.filter(h => !isRichTextEmpty(h.text)).map(h => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: accent, fontWeight: 700, fontSize: '12pt', lineHeight: '1.1', flexShrink: 0 }}>·</span>
                  <span style={{ color: '#475569' }}><RichTextContent html={h.text} /></span>
                </div>
              ))}
            </div>
          </CreativeSection>
        )}

        {experience.length > 0 && (
          <CreativeSection title={sectionTitle(r, 'experience', t('resumeLayout.sections.experience'))} accent={accent}>
            {experience.map(exp => (
              <div key={exp.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '11pt', color: '#0f172a' }}>{exp.position}</span>
                    {exp.company && <span style={{ color: '#64748b', fontWeight: 500 }}>{exp.position ? ' · ' : ''}{exp.company}</span>}
                  </div>
                  <span style={{ fontSize: '8.5pt', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {dateRange(exp.startDate, exp.endDate, exp.current, presentLabel)}
                  </span>
                </div>
                {exp.location && <div style={{ fontSize: '9pt', color: '#94a3b8', marginTop: '1px' }}>{exp.location}</div>}
                {exp.description && <RichTextContent html={exp.description} style={{ marginTop: '4px', color: '#475569', whiteSpace: 'pre-wrap' }} />}
                <HighlightList highlights={exp.highlights} color="#475569" fontSize="10pt" />
              </div>
            ))}
          </CreativeSection>
        )}

        {projects.length > 0 && (
          <CreativeSection title={sectionTitle(r, 'projects', t('resumeLayout.sections.projects'))} accent={accent}>
            {projects.map(p => (
              <div key={p.id} style={{ marginBottom: '9px' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                <RichTextContent html={p.description} style={{ color: '#475569', marginTop: '2px', whiteSpace: 'pre-wrap' }} />
                <HighlightList highlights={p.highlights ?? []} color="#475569" />
                <ProjectTechnologies project={p} color="#475569" />
              </div>
            ))}
          </CreativeSection>
        )}

        {(r.achievements ?? []).filter(a => a.title).length > 0 && (
          <CreativeSection title={sectionTitle(r, 'achievements', t('resumeLayout.sections.achievements'))} accent={accent}>
            <AchievementRows achievements={r.achievements} accent={accent} />
          </CreativeSection>
        )}

        {(r.interests ?? []).filter(i => i.name).length > 0 && (
          <CreativeSection title={sectionTitle(r, 'interests', t('resumeLayout.sections.interests'))} accent={accent}>
            <p style={{ color: '#475569' }}><InterestsList r={r} /></p>
          </CreativeSection>
        )}

        {(r.referees?.length ?? 0) > 0 && (
          <CreativeSection title={sectionTitle(r, 'referees', t('resumeLayout.sections.referees'))} accent={accent}>
            <RefereesBlock r={r} />
          </CreativeSection>
        )}
      </div>
      <div style={{ clear: 'both' }} />
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
