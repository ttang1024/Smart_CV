import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps, type ThemeColors } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, HighlightList, ProjectTechnologies } from '../resumeShared';
import { RichTextContent } from '../RichText';
import { ResumeSections, simpleSectionBodies, visibleHighlights, type SectionBodies } from './ResumeSections';

export function ClassicLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { personalInfo: p, summary, experience, education, skills, projects } = r;

  const bodies: SectionBodies = {
    summary: () => <RichTextContent html={summary} style={{ textAlign: 'justify', whiteSpace: 'pre-wrap' }} />,
    coreHighlights: () => (
      <ul style={{ paddingLeft: '16px', margin: 0, listStyleType: 'disc' }}>
        {visibleHighlights(r).map(h => (
          <li key={h.id} style={{ marginBottom: '3px', color: '#374151', fontSize: '11.5pt' }}><RichTextContent html={h.text} /></li>
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
        {experience.map(exp => (
          <ExpEntry key={exp.id} exp={exp}
            companyColor={theme.main} companySep=" · "
            locColor="#6b7280" dateColor="#6b7280" descColor="#374151"
            descMt="3px" descFontSize="11.5pt" highlightFontSize="11.5pt" mb="10px" />
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
            <RichTextContent html={p.description} style={{ color: '#374151', whiteSpace: 'pre-wrap', fontSize: '11.5pt' }} />
            <HighlightList highlights={p.highlights ?? []} color="#374151" fontSize="11.5pt" />
            <ProjectTechnologies project={p} color="#374151" />
          </div>
        ))}
      </>
    ),
    ...simpleSectionBodies(r, { accent: theme.main, cert: { dateColor: '#6b7280' } }),
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.4', color: '#1a1a1a' }}>
      <div style={{ borderBottom: `2px solid ${theme.main}`, paddingBottom: '10px', marginBottom: '14px' }}>
        <h1 style={{ fontSize: '22pt', fontWeight: 700, color: theme.dark, marginBottom: '2px' }}>
          {p.fullName || 'Your Name'}
        </h1>
        {p.title && <p style={{ fontSize: '12pt', color: theme.main, fontWeight: 500, marginBottom: '6px' }}>{p.title}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '9.5pt', color: '#4b5563' }}>
          <ContactRow items={contactItems(p)} />
        </div>
      </div>
      <ResumeSections r={r} bodies={bodies} renderSection={(title, body) => <ClassicSection title={title} theme={theme}>{body}</ClassicSection>} />
    </div>
  );
}

function ClassicSection({ title, theme, children }: { title: string; theme: ThemeColors; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <h2 style={{
        fontSize: '12pt', fontWeight: 700, color: theme.dark,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: `1px solid ${theme.light}`, paddingBottom: '3px', marginBottom: '8px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
