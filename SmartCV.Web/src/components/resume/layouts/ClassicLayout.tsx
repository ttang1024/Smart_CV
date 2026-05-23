import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps, type ThemeColors } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, CertList, LangList, HighlightList, AchievementRows, InterestsList, RefereesBlock, ProjectTechnologies, sectionTitle } from '../resumeShared';
import { isRichTextEmpty } from '../../../lib/richText';
import { RichTextContent } from '../RichText';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function ClassicLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        return summary ? (
          <ClassicSection key="summary" title={sectionTitle(r, 'summary', t('resumeLayout.sections.summary'))} theme={theme}>
            <RichTextContent html={summary} style={{ textAlign: 'justify', whiteSpace: 'pre-wrap' }} />
          </ClassicSection>
        ) : null;
      case 'coreHighlights':
        return coreHighlights?.length > 0 ? (
          <ClassicSection key="coreHighlights" title={sectionTitle(r, 'coreHighlights', t('resumeLayout.sections.coreHighlights'))} theme={theme}>
            <ul style={{ paddingLeft: '16px', margin: 0, listStyleType: 'disc' }}>
              {coreHighlights.filter(h => !isRichTextEmpty(h.text)).map(h => (
                <li key={h.id} style={{ marginBottom: '3px', color: '#374151', fontSize: '11.5pt' }}><RichTextContent html={h.text} /></li>
              ))}
            </ul>
          </ClassicSection>
        ) : null;
      case 'skills':
        return skills.length > 0 ? (
          <ClassicSection key="skills" title={sectionTitle(r, 'skills', t('resumeLayout.sections.skills'))} theme={theme}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
              {skills.map(s => (
                <div key={s.id}>
                  <span style={{ fontWeight: 600 }}>{s.category}: </span>
                  <span style={{ color: '#374151' }}>{s.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </ClassicSection>
        ) : null;
      case 'experience':
        return experience.length > 0 ? (
          <ClassicSection key="experience" title={sectionTitle(r, 'experience', t('resumeLayout.sections.experience'))} theme={theme}>
            {experience.map(exp => (
              <ExpEntry key={exp.id} exp={exp}
                companyColor={theme.main} companySep=" · "
                locColor="#6b7280" dateColor="#6b7280" descColor="#374151"
                descMt="3px" descFontSize="11.5pt" highlightFontSize="11.5pt" mb="10px" />
            ))}
          </ClassicSection>
        ) : null;
      case 'education':
        return education.length > 0 ? (
          <ClassicSection key="education" title={sectionTitle(r, 'education', t('resumeLayout.sections.education'))} theme={theme}>
            {education.map(edu => (
              <EduEntry key={edu.id} edu={edu}
                accentColor={theme.main} dateColor="#6b7280" gpaColor="#4b5563" />
            ))}
          </ClassicSection>
        ) : null;
      case 'projects':
        return projects.length > 0 ? (
          <ClassicSection key="projects" title={sectionTitle(r, 'projects', t('resumeLayout.sections.projects'))} theme={theme}>
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
          </ClassicSection>
        ) : null;
      case 'certifications':
        return certifications.length > 0 ? (
          <ClassicSection key="certifications" title={sectionTitle(r, 'certifications', t('resumeLayout.sections.certifications'))} theme={theme}>
            <CertList items={certifications} dateColor="#6b7280" />
          </ClassicSection>
        ) : null;
      case 'languages':
        return languages.length > 0 ? (
          <ClassicSection key="languages" title={sectionTitle(r, 'languages', t('resumeLayout.sections.languages'))} theme={theme}>
            <LangList items={languages} />
          </ClassicSection>
        ) : null;
      case 'achievements':
        return (r.achievements ?? []).filter(a => a.title).length > 0 ? (
          <ClassicSection key="achievements" title={sectionTitle(r, 'achievements', t('resumeLayout.sections.achievements'))} theme={theme}>
            <AchievementRows achievements={r.achievements} accent={theme.main} />
          </ClassicSection>
        ) : null;
      case 'interests':
        return (r.interests ?? []).filter(i => i.name).length > 0 ? (
          <ClassicSection key="interests" title={sectionTitle(r, 'interests', t('resumeLayout.sections.interests'))} theme={theme}>
            <p style={{ color: '#374151' }}><InterestsList r={r} /></p>
          </ClassicSection>
        ) : null;
      case 'referees':
        return (r.referees?.length ?? 0) > 0 ? (
          <ClassicSection key="referees" title={sectionTitle(r, 'referees', t('resumeLayout.sections.referees'))} theme={theme}>
            <RefereesBlock r={r} />
          </ClassicSection>
        ) : null;
      default:
        return null;
    }
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
      {sectionOrder.map(key => renderSection(key))}
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
