import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps, type ThemeColors } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, HighlightList, ProjectTechnologies } from '../resumeShared';
import { RichTextContent } from '../RichText';
import { ResumeSections, simpleSectionBodies, visibleHighlights, type SectionBodies } from './ResumeSections';

export function AcademicLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { personalInfo: p, summary, experience, education, skills, projects } = r;

  const bodies: SectionBodies = {
    summary: () => <RichTextContent html={summary} style={{ textAlign: 'justify', color: '#333333', whiteSpace: 'pre-wrap' }} />,
    coreHighlights: () => (
      <ul style={{ paddingLeft: '20px', margin: 0, listStyleType: 'disc' }}>
        {visibleHighlights(r).map(h => (
          <li key={h.id} style={{ marginBottom: '3px', color: '#333333', fontSize: '11.5pt' }}><RichTextContent html={h.text} /></li>
        ))}
      </ul>
    ),
    skills: () => (
      <>
        {skills.map(s => (
          <div key={s.id} style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 700 }}>{s.category}: </span>
            <span style={{ color: '#333333' }}>{s.items.join(', ')}</span>
          </div>
        ))}
      </>
    ),
    experience: () => (
      <>
        {experience.map(exp => (
          <ExpEntry key={exp.id} exp={exp}
            companyColor="#1a1a1a" companyItalic
            locColor="#555555" locSep=", "
            dateColor="#555555" dateFontSize="9.5pt"
            descColor="#333333" descMt="3px" descFontSize="11.5pt"
            positionFontSize="11.5pt" highlightColor="#333333" highlightFontSize="11.5pt" />
        ))}
      </>
    ),
    education: () => (
      <>
        {education.map(edu => (
          <EduEntry key={edu.id} edu={edu}
            accentColor="#1a1a1a" instSep=", " instItalic
            dateColor="#555555" dateFontSize="9.5pt"
            gpaColor="#555555" mb="10px" />
        ))}
      </>
    ),
    projects: () => (
      <>
        {projects.map(p => (
          <div key={p.id} style={{ marginBottom: '8px' }}>
            <span style={{ fontWeight: 700 }}>{p.name}</span>
            <RichTextContent html={p.description} style={{ color: '#333333', marginTop: '2px', whiteSpace: 'pre-wrap', fontSize: '11.5pt' }} />
            <HighlightList highlights={p.highlights ?? []} color="#333333" fontSize="11.5pt" />
            <ProjectTechnologies project={p} color="#333333" />
          </div>
        ))}
      </>
    ),
    ...simpleSectionBodies(r, { accent: theme.main, cert: { dateColor: '#555555', dateFontSize: '9.5pt', dateItalic: true, sep: ', ' }, lang: { gap: '6px 24px', color: '#333333' }, text: '#333333' }),
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.55', color: '#1a1a1a' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20pt', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a1a1a', marginBottom: '4px' }}>
          {p.fullName || 'Your Name'}
        </h1>
        {p.title && (
          <p style={{ fontSize: '11pt', color: '#444444', marginBottom: '8px' }}>{p.title}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 16px', fontSize: '9.5pt', color: '#444444', lineHeight: '1.8' }}>
          <ContactRow items={contactItems(p)} />
        </div>
        <div style={{ borderTop: '2px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', height: '4px', margin: '10px 0 0' }} />
      </div>
      <ResumeSections r={r} bodies={bodies} titleKeys={{ coreHighlights: 'selectedAchievements', projects: 'projectsPublications', certifications: 'certificationsAwards', achievements: 'awardsAchievements' }} renderSection={(title, body) => <AcademicSection title={title} theme={theme}>{body}</AcademicSection>} />
    </div>
  );
}

function AcademicSection({ title, theme, children }: { title: string; theme: ThemeColors; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '11pt', fontWeight: 700, color: theme.main,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        borderBottom: `1px solid ${theme.light}`, paddingBottom: '3px', marginBottom: '8px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
