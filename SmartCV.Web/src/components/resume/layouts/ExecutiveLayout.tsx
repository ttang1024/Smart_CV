import { useTranslation } from 'react-i18next';
import type { LayoutProps, ThemeColors } from '../resumeTypes';
import { ContactRow, contactItems, ExpEntry, EduEntry, CertList, LangList, HighlightList, AchievementRows, InterestsList, RefereesBlock, sectionTitle } from '../resumeShared';
import { isRichTextEmpty } from '../../../lib/richText';
import { RichTextContent } from '../RichText';
import { DEFAULT_SECTION_ORDER } from '../../../types/resume';

export function ExecutiveLayout({ r, theme }: LayoutProps) {
  const { t } = useTranslation();
  const { personalInfo: p, summary, coreHighlights, experience, education, skills, projects, certifications, languages } = r;
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const renderSection = (key: string) => {
    switch (key) {
      case 'summary':
        return summary ? (
          <ExecSection key="summary" title={sectionTitle(r, 'summary', t('resumeLayout.sections.summary'))} theme={theme}>
            <RichTextContent html={summary} style={{ textAlign: 'justify', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }} />
          </ExecSection>
        ) : null;
      case 'coreHighlights':
        return coreHighlights?.length > 0 ? (
          <ExecSection key="coreHighlights" title={sectionTitle(r, 'coreHighlights', t('resumeLayout.sections.coreHighlights'))} theme={theme}>
            <div style={{ columns: 2, columnGap: '20px' }}>
              {coreHighlights.filter(h => !isRichTextEmpty(h.text)).map(h => (
                <div key={h.id} style={{ breakInside: 'avoid', marginBottom: '4px', paddingLeft: '12px', position: 'relative', color: '#374151' }}>
                  <span style={{ position: 'absolute', left: 0, color: theme.main, fontWeight: 700 }}>▸</span>
                  <RichTextContent html={h.text} />
                </div>
              ))}
            </div>
          </ExecSection>
        ) : null;
      case 'skills':
        return skills.length > 0 ? (
          <ExecSection key="skills" title={sectionTitle(r, 'skills', t('resumeLayout.sections.skills'))} theme={theme}>
            <div style={{ columns: 2, columnGap: '20px' }}>
              {skills.map(s => (
                <div key={s.id} style={{ breakInside: 'avoid', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700 }}>{s.category}: </span>
                  <span style={{ color: '#374151' }}>{s.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </ExecSection>
        ) : null;
      case 'experience':
        return experience.length > 0 ? (
          <ExecSection key="experience" title={sectionTitle(r, 'experience', t('resumeLayout.sections.experience'))} theme={theme}>
            {experience.map(exp => (
              <ExpEntry key={exp.id} exp={exp}
                companyColor={theme.main} companyFontSize="11pt"
                locColor="#6b7280" locFontSize="9.5pt" locSep=", "
                dateColor="#6b7280" dateFontSize="9.5pt" dateItalic
                descColor="#374151"
                positionFontSize="11.5pt" positionColor="#1a1a2e" />
            ))}
          </ExecSection>
        ) : null;
      case 'education':
        return education.length > 0 ? (
          <ExecSection key="education" title={sectionTitle(r, 'education', t('resumeLayout.sections.education'))} theme={theme}>
            {education.map(edu => (
              <EduEntry key={edu.id} edu={edu}
                accentColor={theme.main} instSep=" — "
                dateColor="#6b7280" dateFontSize="9.5pt" dateItalic gpaColor="#4b5563" />
            ))}
          </ExecSection>
        ) : null;
      case 'projects':
        return projects.length > 0 ? (
          <ExecSection key="projects" title={sectionTitle(r, 'projects', t('resumeLayout.sections.projectsExecutive'))} theme={theme}>
            {projects.map(p => (
              <div key={p.id} style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                {p.technologies.length > 0 && (
                  <span style={{ fontSize: '9.5pt', color: '#6b7280', marginLeft: '6px' }}>({p.technologies.join(', ')})</span>
                )}
                <RichTextContent html={p.description} style={{ color: '#374151', marginTop: '2px', whiteSpace: 'pre-wrap' }} />
                <HighlightList highlights={p.highlights ?? []} color="#374151" />
              </div>
            ))}
          </ExecSection>
        ) : null;
      case 'certifications':
        return certifications.length > 0 ? (
          <ExecSection key="certifications" title={sectionTitle(r, 'certifications', t('resumeLayout.sections.certifications'))} theme={theme}>
            <CertList items={certifications} dateColor="#6b7280" dateFontSize="9.5pt" dateItalic />
          </ExecSection>
        ) : null;
      case 'languages':
        return languages.length > 0 ? (
          <ExecSection key="languages" title={sectionTitle(r, 'languages', t('resumeLayout.sections.languages'))} theme={theme}>
            <LangList items={languages} />
          </ExecSection>
        ) : null;
      case 'achievements':
        return (r.achievements ?? []).filter(a => a.title).length > 0 ? (
          <ExecSection key="achievements" title={sectionTitle(r, 'achievements', t('resumeLayout.sections.achievements'))} theme={theme}>
            <AchievementRows achievements={r.achievements} accent={theme.main} />
          </ExecSection>
        ) : null;
      case 'interests':
        return (r.interests ?? []).filter(i => i.name).length > 0 ? (
          <ExecSection key="interests" title={sectionTitle(r, 'interests', t('resumeLayout.sections.interests'))} theme={theme}>
            <p style={{ color: '#374151' }}><InterestsList r={r} /></p>
          </ExecSection>
        ) : null;
      case 'referees':
        return (r.referees?.length ?? 0) > 0 ? (
          <ExecSection key="referees" title={sectionTitle(r, 'referees', t('resumeLayout.sections.referees'))} theme={theme}>
            <RefereesBlock r={r} />
          </ExecSection>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: 'Calibri, Arial, Helvetica, "Times New Roman", sans-serif', fontSize: '11pt', lineHeight: '1.45', color: theme.dark }}>
      <div style={{ background: theme.dark, padding: '14mm 14mm 10mm', color: '#ffffff' }}>
        <h1 style={{ fontSize: '26pt', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px', color: '#ffffff' }}>
          {p.fullName || 'Your Name'}
        </h1>
        {p.title && (
          <p style={{ fontSize: '12pt', color: theme.light, fontWeight: 400, letterSpacing: '0.06em', marginBottom: '10px' }}>
            {p.title.toUpperCase()}
          </p>
        )}
        <div style={{ height: '1px', background: theme.main, marginBottom: '10px' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px', fontSize: '9.5pt', color: '#cbd5e1' }}>
          <ContactRow items={contactItems(p)} />
        </div>
      </div>
      <div style={{ padding: '10mm 14mm' }}>
        {sectionOrder.map(key => renderSection(key))}
      </div>
    </div>
  );
}

function ExecSection({ title, theme, children }: { title: string; theme: ThemeColors; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{
        fontSize: '11pt', fontWeight: 700, color: theme.dark,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        borderBottom: `2px solid ${theme.dark}`, paddingBottom: '3px', marginBottom: '8px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
