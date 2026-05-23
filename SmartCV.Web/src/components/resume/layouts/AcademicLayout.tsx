import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps, type ThemeColors } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, CertList, LangList, HighlightList, AchievementRows, InterestsList, RefereesBlock, ProjectTechnologies, sectionTitle } from '../resumeShared';
import { isRichTextEmpty } from '../../../lib/richText';
import { RichTextContent } from '../RichText';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function AcademicLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        return summary ? (
          <AcademicSection key="summary" title={sectionTitle(r, 'summary', t('resumeLayout.sections.summary'))} theme={theme}>
            <RichTextContent html={summary} style={{ textAlign: 'justify', color: '#333333', whiteSpace: 'pre-wrap' }} />
          </AcademicSection>
        ) : null;
      case 'coreHighlights':
        return (coreHighlights ?? []).filter(h => !isRichTextEmpty(h.text)).length > 0 ? (
          <AcademicSection key="coreHighlights" title={sectionTitle(r, 'coreHighlights', t('resumeLayout.sections.selectedAchievements'))} theme={theme}>
            <ul style={{ paddingLeft: '20px', margin: 0, listStyleType: 'disc' }}>
              {(coreHighlights ?? []).filter(h => !isRichTextEmpty(h.text)).map(h => (
                <li key={h.id} style={{ marginBottom: '3px', color: '#333333' }}><RichTextContent html={h.text} /></li>
              ))}
            </ul>
          </AcademicSection>
        ) : null;
      case 'skills':
        return skills.length > 0 ? (
          <AcademicSection key="skills" title={sectionTitle(r, 'skills', t('resumeLayout.sections.skills'))} theme={theme}>
            {skills.map(s => (
              <div key={s.id} style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 700 }}>{s.category}: </span>
                <span style={{ color: '#333333' }}>{s.items.join(', ')}</span>
              </div>
            ))}
          </AcademicSection>
        ) : null;
      case 'experience':
        return experience.length > 0 ? (
          <AcademicSection key="experience" title={sectionTitle(r, 'experience', t('resumeLayout.sections.experience'))} theme={theme}>
            {experience.map(exp => (
              <ExpEntry key={exp.id} exp={exp}
                companyColor="#1a1a1a" companyItalic
                locColor="#555555" locSep=", "
                dateColor="#555555" dateFontSize="9.5pt"
                descColor="#333333" descMt="3px"
                positionFontSize="11.5pt" highlightColor="#333333" />
            ))}
          </AcademicSection>
        ) : null;
      case 'education':
        return education.length > 0 ? (
          <AcademicSection key="education" title={sectionTitle(r, 'education', t('resumeLayout.sections.education'))} theme={theme}>
            {education.map(edu => (
              <EduEntry key={edu.id} edu={edu}
                accentColor="#1a1a1a" instSep=", " instItalic
                dateColor="#555555" dateFontSize="9.5pt"
                gpaColor="#555555" mb="10px" />
            ))}
          </AcademicSection>
        ) : null;
      case 'projects':
        return projects.length > 0 ? (
          <AcademicSection key="projects" title={sectionTitle(r, 'projects', t('resumeLayout.sections.projectsPublications'))} theme={theme}>
            {projects.map(p => (
              <div key={p.id} style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <RichTextContent html={p.description} style={{ color: '#333333', marginTop: '2px', whiteSpace: 'pre-wrap' }} />
                <HighlightList highlights={p.highlights ?? []} color="#333333" />
                <ProjectTechnologies project={p} color="#333333" />
              </div>
            ))}
          </AcademicSection>
        ) : null;
      case 'certifications':
        return certifications.length > 0 ? (
          <AcademicSection key="certifications" title={sectionTitle(r, 'certifications', t('resumeLayout.sections.certificationsAwards'))} theme={theme}>
            <CertList items={certifications} dateColor="#555555" dateFontSize="9.5pt" dateItalic sep=", " />
          </AcademicSection>
        ) : null;
      case 'languages':
        return languages.length > 0 ? (
          <AcademicSection key="languages" title={sectionTitle(r, 'languages', t('resumeLayout.sections.languages'))} theme={theme}>
            <LangList items={languages} gap="6px 24px" color="#333333" />
          </AcademicSection>
        ) : null;
      case 'achievements':
        return (r.achievements ?? []).filter(a => a.title).length > 0 ? (
          <AcademicSection key="achievements" title={sectionTitle(r, 'achievements', t('resumeLayout.sections.awardsAchievements'))} theme={theme}>
            <AchievementRows achievements={r.achievements} accent={theme.main} />
          </AcademicSection>
        ) : null;
      case 'interests':
        return (r.interests ?? []).filter(i => i.name).length > 0 ? (
          <AcademicSection key="interests" title={sectionTitle(r, 'interests', t('resumeLayout.sections.interests'))} theme={theme}>
            <p style={{ color: '#333333' }}><InterestsList r={r} /></p>
          </AcademicSection>
        ) : null;
      case 'referees':
        return (r.referees?.length ?? 0) > 0 ? (
          <AcademicSection key="referees" title={sectionTitle(r, 'referees', t('resumeLayout.sections.referees'))} theme={theme}>
            <RefereesBlock r={r} />
          </AcademicSection>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Calibri, Arial, Helvetica, "Times New Roman", sans-serif', fontSize: '11pt', lineHeight: '1.55', color: '#1a1a1a' }}>
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
      {sectionOrder.map(key => renderSection(key))}
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
