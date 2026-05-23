import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps, type CustomOptions, type CustomSectionStyle } from '../resumeTypes';
import { contactItems, ContactRow, dateRange, EduEntry, ExpEntry, CertList, LangList, HighlightList, AchievementRows, InterestsList, RefereesBlock, ProjectTechnologies, ExperienceProjectRows, sectionTitle } from '../resumeShared';
import { isRichTextEmpty } from '../../../lib/richText';
import { RichTextContent } from '../RichText';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function CustomLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM, options }: LayoutProps & { options: CustomOptions }) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const accent = theme.main;
  const presentLabel = t('resumeLayout.present');
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <CustomSection title={title} accent={accent} sectionStyle={options.sectionStyle}>{children}</CustomSection>
  );

  const header = (
    <>
      {options.header === 'classic' && (
        <div style={{ borderBottom: `2px solid ${accent}`, paddingBottom: '10px', marginBottom: '14px' }}>
          <h1 style={{ fontSize: '22pt', fontWeight: 700, color: theme.dark, marginBottom: '2px' }}>{p.fullName || 'Your Name'}</h1>
          {p.title && <p style={{ fontSize: '12pt', color: accent, fontWeight: 500, marginBottom: '6px' }}>{p.title}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '9.5pt', color: '#4b5563' }}>
            <ContactRow items={contactItems(p)} />
          </div>
        </div>
      )}
      {options.header === 'split' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `3px solid ${accent}`, paddingBottom: '10px', marginBottom: '14px' }}>
          <div>
            <h1 style={{ fontSize: '26pt', fontWeight: 800, color: theme.dark, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '3px' }}>{p.fullName || 'Your Name'}</h1>
            {p.title && <p style={{ fontSize: '12pt', color: accent, fontWeight: 500 }}>{p.title}</p>}
          </div>
          <div style={{ fontSize: '9pt', color: '#4b5563', lineHeight: '1.8' }}>
            {contactItems(p).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {item.icon}<span style={{ verticalAlign: 'middle' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderSummary = () =>
    options.summary === 'callout'
      ? <RichTextContent html={summary} style={{ background: theme.light, borderLeft: `3px solid ${accent}`, padding: '8px 12px', borderRadius: '0 4px 4px 0', color: '#374151', textAlign: 'justify', lineHeight: '1.6', whiteSpace: 'pre-wrap' }} />
      : <RichTextContent html={summary} style={{ color: '#374151', textAlign: 'justify', whiteSpace: 'pre-wrap' }} />;

  const renderSkills = (cols: 1 | 2) =>
    options.skillsStyle === 'tags'
      ? <>{skills.map(s => (
        <div key={s.id} style={{ marginBottom: '6px' }}>
          <div style={{ fontSize: '9pt', fontWeight: 600, color: '#374151', marginBottom: '3px' }}>{s.category}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {s.items.map((item, i) => (
              <span key={i} style={{ fontSize: '8.5pt', padding: '1px 7px', background: theme.light, color: theme.dark, borderRadius: '999px', border: `1px solid ${accent}33` }}>{item}</span>
            ))}
          </div>
        </div>
      ))}</>
      : <div style={{ display: 'grid', gridTemplateColumns: cols === 2 ? '1fr 1fr' : '1fr', gap: '4px 16px' }}>
        {skills.map(s => (
          <div key={s.id}><span style={{ fontWeight: 600 }}>{s.category}: </span><span style={{ color: '#374151' }}>{s.items.join(', ')}</span></div>
        ))}
      </div>;

  const renderEducation = () =>
    options.education === 'compact'
      ? <>{education.map(edu => (
        <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <div>
            <span style={{ fontWeight: 600 }}>{edu.degree}{edu.field ? ` - ${edu.field}` : ''}</span>
            {edu.institution && <span style={{ color: accent }}> · {edu.institution}</span>}
          </div>
          <span style={{ fontSize: '9pt', color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: '8px' }}>{dateRange(edu.startDate, edu.endDate, edu.current, presentLabel)}</span>
        </div>
      ))}</>
      : <>{education.map(edu => <EduEntry key={edu.id} edu={edu} accentColor={accent} dateColor="#9ca3af" gpaColor="#6b7280" />)}</>;

  const renderExperience = () =>
    options.experience === 'list'
      ? <>{experience.map(exp => <ExpEntry key={exp.id} exp={exp} companyColor={accent} companyWeight={500} locColor="#9ca3af" locFontSize="9pt" dateColor="#9ca3af" dateBadge descColor="#4b5563" positionFontSize="11pt" descFontSize="11pt" highlightFontSize="11pt" />)}</>
      : <>{experience.map((exp, idx) => (
        <div key={exp.id} style={{ display: 'flex' }}>
          <div style={{ width: '108px', flexShrink: 0, paddingTop: '3px', fontSize: '9.5pt', fontWeight: 600, color: theme.dark, lineHeight: 1.4 }}>
            {(() => { const range = dateRange(exp.startDate, exp.endDate, exp.current, presentLabel); const [a, b] = range.includes('–') ? range.split('–').map(s => s.trim()) : [range, '']; return <>{a}{b && <> - {b}</>}</>; })()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '18px', flexShrink: 0 }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: accent, border: '2px solid white', boxShadow: `0 0 0 2px ${accent}`, marginTop: '4px', flexShrink: 0 }} />
            {idx < experience.length - 1 && <div style={{ flex: 1, width: '2px', background: theme.light, minHeight: '20px' }} />}
          </div>
          <div style={{ flex: 1, paddingLeft: '10px', paddingBottom: '14px' }}>
            <div>
              <span style={{ fontWeight: 700 }}>{exp.position}</span>
              {exp.company && <span style={{ color: accent, fontWeight: 500 }}>{exp.position ? ' · ' : ''}{exp.company}</span>}
              {exp.location && <span style={{ color: '#9ca3af', fontSize: '9pt' }}>{(exp.position || exp.company) ? ' · ' : ''}{exp.location}</span>}
            </div>
            {exp.description && <RichTextContent html={exp.description} style={{ marginTop: '3px', color: '#4b5563', fontSize: '10pt', whiteSpace: 'pre-wrap' }} />}
            <ExperienceProjectRows projects={exp.projects} color="#4b5563" />
            {(exp.productLinks ?? []).filter(Boolean).length > 0 && (
              <p style={{ marginTop: '3px', fontSize: '9pt', color: '#4b5563', overflowWrap: 'anywhere' }}>
                <strong>Product:</strong> {(exp.productLinks ?? []).filter(Boolean).join(' · ')}
              </p>
            )}
            <HighlightList highlights={exp.highlights} color="#4b5563" fontSize="10pt" />
          </div>
        </div>
      ))}</>;

  const renderProjects = () => (
    <>{projects.map(proj => (
      <div key={proj.id} style={{ marginBottom: '8px' }}>
        <span style={{ fontWeight: 700 }}>{proj.name}</span>
        <RichTextContent html={proj.description} style={{ color: '#4b5563', marginTop: '2px', whiteSpace: 'pre-wrap', fontSize: '11pt' }} />
        <HighlightList highlights={proj.highlights ?? []} color="#4b5563" fontSize="11pt" />
        <ProjectTechnologies project={proj} color="#4b5563" />
      </div>
    ))}</>
  );

  const baseStyle: CSSProperties = { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5pt', lineHeight: '1.45', color: '#1a1a1a' };

  const renderCustomSection = (key: string) => {
    switch (key) {
      case 'summary': return summary ? <Sec key="summary" title={sectionTitle(r, 'summary', t('resumeLayout.sections.summary'))}>{renderSummary()}</Sec> : null;
      case 'coreHighlights': return (coreHighlights ?? []).filter(h => !isRichTextEmpty(h.text)).length > 0 ? (
        <Sec key="coreHighlights" title={sectionTitle(r, 'coreHighlights', t('resumeLayout.sections.coreHighlights'))}>
          <ul style={{ paddingLeft: '16px', margin: 0, listStyleType: 'disc' }}>{coreHighlights.filter(h => !isRichTextEmpty(h.text)).map(h => <li key={h.id} style={{ marginBottom: '3px', color: '#374151', fontSize: '11pt' }}><RichTextContent html={h.text} /></li>)}</ul>
        </Sec>
      ) : null;
      case 'skills': return skills.length > 0 ? <Sec key="skills" title={sectionTitle(r, 'skills', t('resumeLayout.sections.skills'))}>{renderSkills(options.skillsColumns)}</Sec> : null;
      case 'experience': return experience.length > 0 ? <Sec key="experience" title={sectionTitle(r, 'experience', t('resumeLayout.sections.experience'))}>{renderExperience()}</Sec> : null;
      case 'education': return education.length > 0 ? <Sec key="education" title={sectionTitle(r, 'education', t('resumeLayout.sections.education'))}>{renderEducation()}</Sec> : null;
      case 'projects': return projects.length > 0 ? <Sec key="projects" title={sectionTitle(r, 'projects', t('resumeLayout.sections.projects'))}>{renderProjects()}</Sec> : null;
      case 'certifications': return certifications.length > 0 ? <Sec key="certifications" title={sectionTitle(r, 'certifications', t('resumeLayout.sections.certifications'))}><CertList items={certifications} dateColor="#9ca3af" /></Sec> : null;
      case 'languages': return languages.length > 0 ? <Sec key="languages" title={sectionTitle(r, 'languages', t('resumeLayout.sections.languages'))}><LangList items={languages} gap="8px 20px" profColor="#9ca3af" /></Sec> : null;
      case 'achievements': return (r.achievements ?? []).filter(a => a.title).length > 0 ? <Sec key="achievements" title={sectionTitle(r, 'achievements', t('resumeLayout.sections.achievements'))}><AchievementRows achievements={r.achievements} accent={accent} /></Sec> : null;
      case 'interests': return (r.interests ?? []).filter(i => i.name).length > 0 ? <Sec key="interests" title={sectionTitle(r, 'interests', t('resumeLayout.sections.interests'))}><p style={{ color: '#374151' }}><InterestsList r={r} /></p></Sec> : null;
      case 'referees': return (r.referees?.length ?? 0) > 0 ? <Sec key="referees" title={sectionTitle(r, 'referees', t('resumeLayout.sections.referees'))}><RefereesBlock r={r} /></Sec> : null;
      default: return null;
    }
  };

  return (
    <div style={{ ...baseStyle, padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm` }}>
      {header}
      {sectionOrder.map(key => renderCustomSection(key))}
    </div>
  );
}

function CustomSection({ title, accent, sectionStyle, children }: { title: string; accent: string; sectionStyle: CustomSectionStyle; children: React.ReactNode }) {
  if (sectionStyle === 'underline') {
    return (
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontSize: '12pt', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1.5px solid ${accent}`, paddingBottom: '3px', marginBottom: '8px' }}>{title}</h2>
        {children}
      </div>
    );
  }
  if (sectionStyle === 'plain') {
    return (
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontSize: '10.5pt', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '8px' }}>{title}</h2>
        {children}
      </div>
    );
  }
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{ width: '4px', height: '18px', background: accent, borderRadius: '2px', flexShrink: 0 }} />
        <h2 style={{ fontSize: '12pt', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
