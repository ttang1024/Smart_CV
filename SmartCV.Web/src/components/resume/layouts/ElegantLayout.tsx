import { useTranslation } from 'react-i18next';
import { DEFAULT_PAGE_MARGINS_MM, type LayoutProps } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, CertList, LangList, HighlightList, AchievementRows, InterestsList, RefereesBlock, ProjectTechnologies, sectionTitle } from '../resumeShared';
import { isRichTextEmpty } from '../../../lib/richText';
import { RichTextContent } from '../RichText';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function ElegantLayout({ r, theme, pageMarginsMm = DEFAULT_PAGE_MARGINS_MM }: LayoutProps) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const gold = theme.main;
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        return summary ? (
          <ElegantSection key="summary" title={sectionTitle(r, 'summary', t('resumeLayout.sections.summary'))} gold={gold} light={theme.light}>
            <RichTextContent html={summary} style={{ textAlign: 'justify', color: '#4a3c28', whiteSpace: 'pre-wrap' }} />
          </ElegantSection>
        ) : null;
      case 'coreHighlights':
        return (coreHighlights ?? []).filter(h => !isRichTextEmpty(h.text)).length > 0 ? (
          <ElegantSection key="coreHighlights" title={sectionTitle(r, 'coreHighlights', t('resumeLayout.sections.coreHighlights'))} gold={gold} light={theme.light}>
            <ul style={{ paddingLeft: '18px', margin: 0 }}>
              {(coreHighlights ?? []).filter(h => !isRichTextEmpty(h.text)).map(h => (
                <li key={h.id} style={{ marginBottom: '3px', color: '#4a3c28' }}><RichTextContent html={h.text} /></li>
              ))}
            </ul>
          </ElegantSection>
        ) : null;
      case 'skills':
        return skills.length > 0 ? (
          <ElegantSection key="skills" title={sectionTitle(r, 'skills', t('resumeLayout.sections.skills'))} gold={gold} light={theme.light}>
            <div style={{ columns: 2, columnGap: '16px' }}>
              {skills.map(s => (
                <div key={s.id} style={{ breakInside: 'avoid', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700 }}>{s.category}: </span>
                  <span style={{ color: '#4a3c28' }}>{s.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </ElegantSection>
        ) : null;
      case 'experience':
        return experience.length > 0 ? (
          <ElegantSection key="experience" title={sectionTitle(r, 'experience', t('resumeLayout.sections.experience'))} gold={gold} light={theme.light}>
            {experience.map(exp => (
              <ExpEntry key={exp.id} exp={exp}
                companyColor={gold} locColor="#7a6a50" locFontSize="9.5pt"
                dateColor="#7a6a50" dateFontSize="9.5pt" dateItalic
                descColor="#4a3c28" descMt="3px"
                positionFontSize="11.5pt" highlightColor="#4a3c28" mb="11px" />
            ))}
          </ElegantSection>
        ) : null;
      case 'education':
        return education.length > 0 ? (
          <ElegantSection key="education" title={sectionTitle(r, 'education', t('resumeLayout.sections.education'))} gold={gold} light={theme.light}>
            {education.map(edu => (
              <EduEntry key={edu.id} edu={edu}
                accentColor={gold} dateColor="#7a6a50" dateFontSize="9.5pt" dateItalic
                gpaColor="#7a6a50" />
            ))}
          </ElegantSection>
        ) : null;
      case 'projects':
        return projects.length > 0 ? (
          <ElegantSection key="projects" title={sectionTitle(r, 'projects', t('resumeLayout.sections.projects'))} gold={gold} light={theme.light}>
            {projects.map(p => (
              <div key={p.id} style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <RichTextContent html={p.description} style={{ color: '#4a3c28', marginTop: '2px', whiteSpace: 'pre-wrap' }} />
                <HighlightList highlights={p.highlights ?? []} color="#4a3c28" />
                <ProjectTechnologies project={p} color="#4a3c28" />
              </div>
            ))}
          </ElegantSection>
        ) : null;
      case 'certifications':
        return certifications.length > 0 ? (
          <ElegantSection key="certifications" title={sectionTitle(r, 'certifications', t('resumeLayout.sections.certifications'))} gold={gold} light={theme.light}>
            <CertList items={certifications} dateColor="#7a6a50" dateFontSize="9.5pt" dateItalic />
          </ElegantSection>
        ) : null;
      case 'languages':
        return languages.length > 0 ? (
          <ElegantSection key="languages" title={sectionTitle(r, 'languages', t('resumeLayout.sections.languages'))} gold={gold} light={theme.light}>
            <LangList items={languages} color="#4a3c28" />
          </ElegantSection>
        ) : null;
      case 'achievements':
        return (r.achievements ?? []).filter(a => a.title).length > 0 ? (
          <ElegantSection key="achievements" title={sectionTitle(r, 'achievements', t('resumeLayout.sections.achievements'))} gold={gold} light={theme.light}>
            <AchievementRows achievements={r.achievements} accent={gold} />
          </ElegantSection>
        ) : null;
      case 'interests':
        return (r.interests ?? []).filter(i => i.name).length > 0 ? (
          <ElegantSection key="interests" title={sectionTitle(r, 'interests', t('resumeLayout.sections.interests'))} gold={gold} light={theme.light}>
            <p style={{ color: '#4a3c28' }}><InterestsList r={r} /></p>
          </ElegantSection>
        ) : null;
      case 'referees':
        return (r.referees?.length ?? 0) > 0 ? (
          <ElegantSection key="referees" title={sectionTitle(r, 'referees', t('resumeLayout.sections.referees'))} gold={gold} light={theme.light}>
            <RefereesBlock r={r} />
          </ElegantSection>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: `${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`, fontFamily: 'Calibri, Arial, Helvetica, "Times New Roman", sans-serif', fontSize: '11pt', lineHeight: '1.55', color: '#2c2416' }}>
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
      {sectionOrder.map(key => renderSection(key))}
    </div>
  );
}

function ElegantSection({ title, gold, light, children }: { title: string; gold: string; light: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '10.5pt', fontWeight: 700, color: '#2c2416',
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
