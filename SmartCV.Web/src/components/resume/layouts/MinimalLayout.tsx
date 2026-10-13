import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps, type ThemeColors } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, HighlightList, ProjectTechnologies } from '../resumeShared';
import { RichTextContent } from '../RichText';
import { ResumeSections, simpleSectionBodies, visibleHighlights, type SectionBodies } from './ResumeSections';

export function MinimalLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { personalInfo: p, summary, experience, education, skills, projects } = r;

  const bodies: SectionBodies = {
    summary: () => <RichTextContent html={summary} style={{ color: '#444444', textAlign: 'justify', whiteSpace: 'pre-wrap' }} />,
    coreHighlights: () => (
      <ul style={{ paddingLeft: '18px', margin: 0, listStyleType: 'disc' }}>
        {visibleHighlights(r).map(h => (
          <li key={h.id} style={{ marginBottom: '3px', color: '#444444', fontSize: '11pt' }}><RichTextContent html={h.text} /></li>
        ))}
      </ul>
    ),
    skills: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {skills.map(s => (
          <div key={s.id}>
            <span style={{ fontWeight: 600, color: '#333333' }}>{s.category} </span>
            <span style={{ color: '#666666' }}>— {s.items.join(', ')}</span>
          </div>
        ))}
      </div>
    ),
    experience: () => (
      <>
        {experience.map(exp => (
          <ExpEntry key={exp.id} exp={exp}
            companyColor="#888888" locColor="#aaaaaa" locSep=", "
            dateColor="#aaaaaa" descColor="#555555"
            positionWeight={600} descFontSize="11pt" highlightFontSize="11pt" />
        ))}
      </>
    ),
    education: () => (
      <>
        {education.map(edu => (
          <EduEntry key={edu.id} edu={edu}
            accentColor="#888888" instSep=", "
            dateColor="#aaaaaa" gpaColor="#888888" degreeWeight={600} />
        ))}
      </>
    ),
    projects: () => (
      <>
        {projects.map(p => (
          <div key={p.id} style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 600 }}>{p.name}</span>
            <RichTextContent html={p.description} style={{ color: '#555555', marginTop: '2px', whiteSpace: 'pre-wrap', fontSize: '11pt' }} />
            <HighlightList highlights={p.highlights ?? []} color="#555555" fontSize="11pt" />
            <ProjectTechnologies project={p} color="#555555" />
          </div>
        ))}
      </>
    ),
    ...simpleSectionBodies(r, { accent: theme.main, cert: { dateColor: '#aaaaaa' }, lang: { gap: '8px 20px', color: '#555555' }, text: '#555555' }),
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5pt', lineHeight: '1.5', color: '#222222' }}>
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
      <ResumeSections r={r} bodies={bodies} titleKeys={{ coreHighlights: 'highlightsMinimal' }} renderSection={(title, body) => <MinimalSection title={title} theme={theme}>{body}</MinimalSection>} />
    </div>
  );
}

function MinimalSection({ title, theme, children }: { title: string; theme: ThemeColors; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '9.5pt', fontWeight: 600, color: theme.main,
        textTransform: 'uppercase', letterSpacing: '0.14em',
        borderBottom: `1px dotted ${theme.light}`, paddingBottom: '4px', marginBottom: '8px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
