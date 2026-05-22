import { MailOutlined, PhoneOutlined, EnvironmentOutlined, LinkedinOutlined, GithubOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Resume, Experience, Education, Certification, Language, ResumeSection, Project } from '../../types/resume';
import { isRichTextEmpty } from '../../lib/richText';
import { RichTextContent } from './RichText';

export interface ContactItem { icon: React.ReactNode; text: string }

export function sectionTitle(r: Resume, key: ResumeSection, fallback: string): string {
  return r.sectionTitles?.[key]?.trim() || fallback;
}

export const contactIcon = (Icon: React.ComponentType<{ style?: React.CSSProperties }>) => (
  <Icon style={{ fontSize: '11px', display: 'inline-block', verticalAlign: 'middle', lineHeight: 1 }} />
);

export function contactItems(p: Resume['personalInfo']): ContactItem[] {
  return [
    p.email ? { icon: contactIcon(MailOutlined), text: p.email } : null,
    p.phone ? { icon: contactIcon(PhoneOutlined), text: p.phone } : null,
    p.location ? { icon: contactIcon(EnvironmentOutlined), text: p.location } : null,
    p.linkedin ? { icon: contactIcon(LinkedinOutlined), text: p.linkedin } : null,
    p.github ? { icon: contactIcon(GithubOutlined), text: p.github } : null,
    p.website ? { icon: contactIcon(GlobalOutlined), text: p.website } : null,
  ].filter(Boolean) as ContactItem[];
}

export function ContactRow({ items, style }: { items: ContactItem[]; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', justifyContent: 'start', gap: '4px 20px' }}>
      {items.map((item, i) => (
        <span key={i} style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px', ...style }}>
          {item.icon}
          <span>{item.text}</span>
        </span>
      ))}
    </div>
  );
}

export function dateRange(start?: string, end?: string, current?: boolean, presentLabel = 'Present'): string {
  const endLabel = current ? presentLabel : end;
  if (start && endLabel) return `${start} – ${endLabel}`;
  return start ?? endLabel ?? '';
}

export function AchievementRows({ achievements, accent }: { achievements: Resume['achievements']; accent: string }) {
  const items = (achievements ?? []).filter(a => a.title);
  if (!items.length) return null;
  return (
    <>
      {items.map(a => (
        <div key={a.id} style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700 }}>{a.title}</span>
            {a.date && <span style={{ fontSize: '9pt', color: '#6b7280', whiteSpace: 'nowrap' }}>{a.date}</span>}
          </div>
          {a.issuer && <div style={{ fontSize: '9.5pt', color: accent }}>{a.issuer}</div>}
          {a.description && (
            <RichTextContent html={a.description} style={{ fontSize: '9.5pt', color: '#374151', marginTop: '2px' }} />
          )}
        </div>
      ))}
    </>
  );
}

export function InterestsList({ r }: { r: Resume }) {
  const items = r.interests ?? [];
  if (!items.length) return null;
  return <>{items.map(i => i.name).filter(Boolean).join(' · ')}</>;
}

export function RefereesBlock({ r }: { r: Resume }) {
  const refs = r.referees ?? [];
  if (!refs.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
      {refs.map(ref => (
        <div key={ref.id}>
          <div style={{ fontWeight: 700 }}>{ref.name}</div>
          {(ref.title || ref.company) && (
            <div style={{ fontSize: '9pt', color: '#374151' }}>
              {[ref.title, ref.company].filter(Boolean).join(', ')}
            </div>
          )}
          {ref.email && <div style={{ fontSize: '9pt', color: '#6b7280' }}>{ref.email}</div>}
          {ref.phone && <div style={{ fontSize: '9pt', color: '#6b7280' }}>{ref.phone}</div>}
        </div>
      ))}
    </div>
  );
}

export function HighlightList({ highlights, color, fontSize }: {
  highlights: string[];
  color?: string;
  fontSize?: string;
}) {
  const items = highlights.filter(h => !isRichTextEmpty(h));
  if (!items.length) return null;
  return (
    <ul style={{ marginTop: '4px', paddingLeft: 0, listStyle: 'none', ...(fontSize && { fontSize }) }}>
      {items.map((h, i) => (
        <li key={i} style={{ marginBottom: '2px', ...(color && { color }) }}>
          <RichTextContent html={h} />
        </li>
      ))}
    </ul>
  );
}

export function ProjectTechnologies({ project, color, fontSize, label = 'Tech:' }: {
  project: Project;
  color?: string;
  fontSize?: string;
  label?: string;
}) {
  const hasLinks = Boolean(project.github || project.url);
  if (!project.technologies.length && !hasLinks) return null;
  return (
    <div style={{ ...(color && { color }), ...(fontSize && { fontSize }), marginTop: '2px', overflowWrap: 'anywhere' }}>
      {project.technologies.length > 0 && (
        <div><strong>{label}</strong> {project.technologies.join(', ')}</div>
      )}
      {hasLinks && (
        <div>
          {project.github && <p><strong>GitHub:</strong> {project.github}</p>}
          {project.url && <p><strong>Live:</strong> {project.url}</p>}
        </div>
      )}
    </div>
  );
}

export function ExpEntry({ exp, companyColor, locColor, dateColor, descColor,
  companySep = ' · ', companyFontSize, companyWeight,
  locFontSize = '9.5pt', locSep = ' · ',
  dateFontSize = '9pt', dateBadge,
  positionFontSize, positionWeight = 700, positionColor,
  descMt = '4px', highlightColor, highlightFontSize, mb = '12px',
}: {
  exp: Experience;
  companyColor: string;
  locColor: string;
  dateColor: string;
  descColor: string;
  companySep?: string;
  companyFontSize?: string;
  companyWeight?: number;
  companyItalic?: boolean;
  locFontSize?: string;
  locSep?: string;
  dateFontSize?: string;
  dateItalic?: boolean;
  dateBadge?: boolean;
  positionFontSize?: string;
  positionWeight?: number;
  positionColor?: string;
  descMt?: string;
  highlightColor?: string;
  highlightFontSize?: string;
  mb?: string;
}) {
  const { t } = useTranslation();
  const presentLabel = t('resumeLayout.present');
  return (
    <div style={{ marginBottom: mb }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <span style={{ fontWeight: positionWeight, ...(positionFontSize && { fontSize: positionFontSize }), ...(positionColor && { color: positionColor }) }}>
            {exp.position}
          </span>
          {exp.company && (
            <span style={{ color: companyColor, ...(companyFontSize && { fontSize: companyFontSize }), ...(companyWeight && { fontWeight: companyWeight }) }}>
              {exp.position ? companySep : ''}{exp.company}
            </span>
          )}
          {exp.location && <span style={{ color: locColor, fontSize: locFontSize }}>{(exp.position || exp.company) ? locSep : ''}{exp.location}</span>}
        </div>
        {dateBadge ? (
          <span style={{ fontSize: dateFontSize, color: dateColor, whiteSpace: 'nowrap', background: '#f3f4f6', padding: '1px 6px', borderRadius: '4px' }}>
            {dateRange(exp.startDate, exp.endDate, exp.current, presentLabel)}
          </span>
        ) : (
          <span style={{ fontSize: dateFontSize, color: dateColor, whiteSpace: 'nowrap' }}>
            {dateRange(exp.startDate, exp.endDate, exp.current, presentLabel)}
          </span>
        )}
      </div>
      {exp.description && <RichTextContent html={exp.description} style={{ marginTop: descMt, color: descColor }} />}
      <HighlightList highlights={exp.highlights} color={highlightColor} fontSize={highlightFontSize} />
    </div>
  );
}

export function EduEntry({ edu, accentColor, instSep = ' · ', dateColor, dateFontSize = '9pt', gpaColor, mb = '8px', degreeWeight = 700 }: {
  edu: Education;
  accentColor: string;
  instSep?: string;
  instItalic?: boolean;
  dateColor: string;
  dateFontSize?: string;
  dateItalic?: boolean;
  gpaColor: string;
  mb?: string;
  degreeWeight?: number;
}) {
  const { t } = useTranslation();
  const presentLabel = t('resumeLayout.present');
  const gpaLabel = t('resumeLayout.gpa');
  return (
    <div style={{ marginBottom: mb }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontWeight: degreeWeight }}>{edu.degree}{edu.field ? ` - ${edu.field}` : ''}</span>
          {edu.institution && (
            <span style={{ color: accentColor }}>{instSep}{edu.institution}</span>
          )}
        </div>
        <span style={{ fontSize: dateFontSize, color: dateColor }}>
          {dateRange(edu.startDate, edu.endDate, edu.current, presentLabel)}
        </span>
      </div>
      {(edu.gpa || edu.honors) && (
        <p style={{ fontSize: '9.5pt', color: gpaColor, marginTop: '2px' }}>
          {edu.gpa && `${gpaLabel}: ${edu.gpa}`}{edu.gpa && edu.honors && ' · '}{edu.honors}
        </p>
      )}
    </div>
  );
}

export function CertList({ items, dateColor, dateFontSize = '9pt', sep = ' · ' }: {
  items: Certification[];
  dateColor: string;
  dateFontSize?: string;
  dateItalic?: boolean;
  sep?: string;
}) {
  return (
    <>
      {items.map(c => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span><strong>{c.name}</strong>{sep}{c.issuer}</span>
          <span style={{ fontSize: dateFontSize, color: dateColor }}>{c.date}</span>
        </div>
      ))}
    </>
  );
}

export function LangList({ items, color, gap = '8px 24px', profColor }: {
  items: Language[];
  color?: string;
  gap?: string;
  profColor?: string;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap, ...(color && { color }) }}>
      {items.map(l => (
        <span key={l.id}>
          <strong>{l.language}</strong>
          {profColor ? <span style={{ color: profColor }}> ({l.proficiency})</span> : <> ({l.proficiency})</>}
        </span>
      ))}
    </div>
  );
}
