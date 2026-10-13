import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, HighlightList, ProjectTechnologies } from '../resumeShared';
import { RichTextContent } from '../RichText';
import { ResumeSections, simpleSectionBodies, visibleHighlights, type SectionBodies } from './ResumeSections';

export function ElegantLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { personalInfo: p, summary, experience, education, skills, projects } = r;
  const gold = theme.main;

  const bodies: SectionBodies = {
    summary: () => <RichTextContent html={summary} style={{ textAlign: 'justify', color: '#4a3c28', whiteSpace: 'pre-wrap' }} />,
    coreHighlights: () => (
      <ul style={{ paddingLeft: '18px', margin: 0, listStyleType: 'disc' }}>
        {visibleHighlights(r).map(h => (
          <li key={h.id} style={{ marginBottom: '3px', color: '#4a3c28', fontSize: '11.5pt' }}><RichTextContent html={h.text} /></li>
        ))}
      </ul>
    ),
    skills: () => (
      <div>
        {skills.map(s => (
          <div key={s.id} style={{ breakInside: 'avoid', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700 }}>{s.category}: </span>
            <span style={{ color: '#4a3c28' }}>{s.items.join(', ')}</span>
          </div>
        ))}
      </div>
    ),
    experience: () => (
      <>
        {experience.map(exp => (
          <ExpEntry key={exp.id} exp={exp}
            companyColor={gold} locColor="#7a6a50" locFontSize="9.5pt"
            dateColor="#7a6a50" dateFontSize="9.5pt" dateItalic
            descColor="#4a3c28" descMt="3px" descFontSize="11.5pt"
            positionFontSize="11.5pt" highlightColor="#4a3c28" highlightFontSize="11.5pt" mb="11px" />
        ))}
      </>
    ),
    education: () => (
      <>
        {education.map(edu => (
          <EduEntry key={edu.id} edu={edu}
            accentColor={gold} dateColor="#7a6a50" dateFontSize="9.5pt" dateItalic
            gpaColor="#7a6a50" />
        ))}
      </>
    ),
    projects: () => (
      <>
        {projects.map(p => (
          <div key={p.id} style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 700 }}>{p.name}</span>
            <RichTextContent html={p.description} style={{ color: '#4a3c28', marginTop: '2px', whiteSpace: 'pre-wrap', fontSize: '11.5pt' }} />
            <HighlightList highlights={p.highlights ?? []} color="#4a3c28" fontSize="11.5pt" />
            <ProjectTechnologies project={p} color="#4a3c28" />
          </div>
        ))}
      </>
    ),
    ...simpleSectionBodies(r, { accent: gold, cert: { dateColor: '#7a6a50', dateFontSize: '9.5pt', dateItalic: true }, lang: { color: '#4a3c28' }, text: '#4a3c28' }),
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.55', color: '#2c2416' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '26pt', fontWeight: 700, letterSpacing: '0.06em', color: '#1a1208', marginBottom: '4px' }}>
          {p.fullName || 'Your Name'}
        </h1>
        {p.title && (
          <p style={{ fontSize: '11pt', color: gold, letterSpacing: '0.04em', marginBottom: '8px' }}>{p.title}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 20px', fontSize: '9pt', color: '#6b5c3e' }}>
          <ContactRow items={contactItems(p)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0 0' }}>
          <div style={{ flex: 1, height: '1px', background: gold }} />
          <span style={{ color: gold, fontSize: '14pt', lineHeight: 1 }}>◆</span>
          <div style={{ flex: 1, height: '1px', background: gold }} />
        </div>
      </div>
      <ResumeSections r={r} bodies={bodies} renderSection={(title, body) => <ElegantSection title={title} gold={gold} light={theme.light}>{body}</ElegantSection>} />
    </div>
  );
}

function ElegantSection({ title, gold, light, children }: { title: string; gold: string; light: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '11.5pt', fontWeight: 700, color: '#2c2416',
        textTransform: 'uppercase', letterSpacing: '0.14em',
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px',
      }}>
        <span style={{ flex: 1, height: '1px', background: light, display: 'inline-block' }} />
        <span style={{ color: gold }}>{title}</span>
        <span style={{ flex: 1, height: '1px', background: light, display: 'inline-block' }} />
      </h2>
      {children}
    </div>
  );
}
