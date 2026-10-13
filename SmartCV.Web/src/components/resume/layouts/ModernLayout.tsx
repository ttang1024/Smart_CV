import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, HighlightList, ProjectTechnologies } from '../resumeShared';
import { RichTextContent } from '../RichText';
import { ResumeSections, simpleSectionBodies, visibleHighlights, type SectionBodies } from './ResumeSections';

export function ModernLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { personalInfo: p, summary, experience, education, skills, projects } = r;
  const accent = theme.main;

  const bodies: SectionBodies = {
    summary: () => <RichTextContent html={summary} style={{ color: '#374151', textAlign: 'justify', whiteSpace: 'pre-wrap' }} />,
    coreHighlights: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {visibleHighlights(r).map(h => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: accent, fontWeight: 700, fontSize: '13pt', lineHeight: '1.1', flexShrink: 0 }}>›</span>
            <span style={{ color: '#374151', fontSize: '11pt' }}><RichTextContent html={h.text} /></span>
          </div>
        ))}
      </div>
    ),
    skills: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {skills.map(s => (
          <div key={s.id} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 600, color: accent, minWidth: '80px', fontSize: '9.5pt' }}>{s.category}</span>
            <span style={{ color: '#374151' }}>{s.items.join(' · ')}</span>
          </div>
        ))}
      </div>
    ),
    experience: () => (
      <>
        {experience.map(exp => (
          <ExpEntry key={exp.id} exp={exp}
            companyColor={accent} companyWeight={500}
            locColor="#9ca3af" locFontSize="9pt"
            dateColor="#9ca3af" dateBadge descColor="#4b5563"
            positionFontSize="11pt" descFontSize="11pt" highlightFontSize="11pt" />
        ))}
      </>
    ),
    education: () => (
      <>
        {education.map(edu => (
          <EduEntry key={edu.id} edu={edu}
            accentColor={accent} dateColor="#9ca3af" gpaColor="#6b7280" />
        ))}
      </>
    ),
    projects: () => (
      <>
        {projects.map(p => (
          <div key={p.id} style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 700 }}>{p.name}</span>
            <RichTextContent html={p.description} style={{ color: '#4b5563', marginTop: '2px', whiteSpace: 'pre-wrap', fontSize: '11pt' }} />
            <HighlightList highlights={p.highlights ?? []} color="#4b5563" fontSize="11pt" />
            <ProjectTechnologies project={p} color="#4b5563" />
          </div>
        ))}
      </>
    ),
    ...simpleSectionBodies(r, { accent: accent, cert: { dateColor: '#9ca3af' }, lang: { gap: '8px 20px', profColor: '#9ca3af' } }),
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5pt', lineHeight: '1.45', color: '#111827' }}>
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
      <ResumeSections r={r} bodies={bodies} renderSection={(title, body) => <ModernSection title={title} accent={accent}>{body}</ModernSection>} />
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
