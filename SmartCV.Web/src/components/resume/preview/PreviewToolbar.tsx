import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  STYLES, DEFAULT_PAGE_MARGINS_MM,
  type StyleId, type CustomOptions, type PageMarginsMm,
} from '../resumeTypes';
import { PAGE_SIZES, type PageSizeId, MIN_PAGE_MARGIN_MM, MAX_PAGE_MARGIN_MM } from './constants';

const MARGIN_PRESETS: { key: string; margins: PageMarginsMm }[] = [
  { key: 'presetNormal', margins: { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4 } },
  { key: 'presetModerate', margins: DEFAULT_PAGE_MARGINS_MM },
  { key: 'presetNarrow', margins: { top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 } },
  { key: 'presetCompact', margins: { top: 8, bottom: 8, left: 8, right: 8 } },
];

const SIDES: (keyof PageMarginsMm)[] = ['top', 'bottom', 'left', 'right'];
const SIDE_LABEL_KEYS: Record<keyof PageMarginsMm, string> = {
  top: 'marginTop', bottom: 'marginBottom', left: 'marginLeft', right: 'marginRight',
};

function Chip({ active, onClick, children, size = 'sm' }: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: 'sm' | 'xs';
}) {
  return (
    <button
      onClick={onClick}
      className={`${size === 'sm' ? 'px-2.5 py-1' : 'px-2 py-0.5'} rounded text-xs font-medium transition-all ${active
        ? 'bg-emerald-600 text-white shadow-sm'
        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500'
        }`}
    >
      {children}
    </button>
  );
}

function ColourInput({ label, value, onChange, title, spaced }: {
  label: string; value: string; onChange: (v: string) => void; title: string; spaced?: boolean;
}) {
  return (
    <>
      <span className={`${spaced ? 'ml-3 ' : ''}text-xs text-gray-500 dark:text-gray-400 shrink-0`}>{label}</span>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-7 h-7 rounded cursor-pointer border border-gray-300 dark:border-gray-600 bg-transparent p-0.5"
        title={title}
      />
      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{value}</span>
    </>
  );
}

export function StylePicker({ styleId, onChange }: { styleId: StyleId; onChange: (id: StyleId) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {STYLES.map(s => (
        <Chip key={s.id} active={styleId === s.id} onClick={() => onChange(s.id)}>{s.label}</Chip>
      ))}
    </div>
  );
}

export function ColourControls({ mainColor, onMainColor, executive }: {
  mainColor: string;
  onMainColor: (v: string) => void;
  /** Background / name colours only apply to the Executive style. */
  executive?: { backgroundColor: string; onBackgroundColor: (v: string) => void; fullNameColor: string; onFullNameColor: (v: string) => void };
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <ColourInput label={t('resumeLayout.preview.themeColour')} value={mainColor} onChange={onMainColor} title={t('app.preview.pickTheme')} />
      {executive && (
        <>
          <ColourInput spaced label={t('resumeLayout.preview.backgroundColour')} value={executive.backgroundColor} onChange={executive.onBackgroundColor} title={t('app.preview.pickBackground')} />
          <ColourInput spaced label={t('resumeLayout.preview.fullNameColour')} value={executive.fullNameColor} onChange={executive.onFullNameColor} title={t('app.preview.pickNameColour')} />
        </>
      )}
    </div>
  );
}

export function PageSetup({ pageSize, onPageSize, margins, onMargins }: {
  pageSize: PageSizeId;
  onPageSize: (id: PageSizeId) => void;
  margins: PageMarginsMm;
  onMargins: (m: PageMarginsMm) => void;
}) {
  const { t } = useTranslation();
  // Free-typed drafts are only clamped and applied on blur.
  const [draft, setDraft] = useState<Record<keyof PageMarginsMm, string> | null>(null);
  const shown = (side: keyof PageMarginsMm) => draft?.[side] ?? String(margins[side]);

  const commit = (side: keyof PageMarginsMm) => {
    const parsed = parseFloat(shown(side));
    const clamped = Number.isNaN(parsed)
      ? margins[side]
      : Math.min(MAX_PAGE_MARGIN_MM, Math.max(MIN_PAGE_MARGIN_MM, parsed));
    setDraft(null);
    if (clamped !== margins[side]) onMargins({ ...margins, [side]: clamped });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.pageSize')}</span>
      {(Object.keys(PAGE_SIZES) as PageSizeId[]).map(id => (
        <Chip key={id} size="xs" active={pageSize === id} onClick={() => onPageSize(id)}>{PAGE_SIZES[id].label}</Chip>
      ))}
      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.pageMargins')}</span>
      {SIDES.map(side => (
        <label key={side} className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t(`resumeLayout.preview.${SIDE_LABEL_KEYS[side]}`)}</span>
          <input
            type="number"
            min={MIN_PAGE_MARGIN_MM}
            max={MAX_PAGE_MARGIN_MM}
            step="0.1"
            value={shown(side)}
            onChange={e => setDraft({ top: shown('top'), bottom: shown('bottom'), left: shown('left'), right: shown('right'), [side]: e.target.value })}
            onBlur={() => commit(side)}
            className="w-14 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-200"
          />
        </label>
      ))}
      <span className="text-xs text-gray-400 dark:text-gray-500">{t('resumeLayout.preview.mm')}</span>
      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.presets')}</span>
      {MARGIN_PRESETS.map(preset => (
        <Chip key={preset.key} size="xs" onClick={() => { setDraft(null); onMargins(preset.margins); }}>
          {t(`resumeLayout.preview.${preset.key}`)}
        </Chip>
      ))}
    </div>
  );
}

type OptionGroup = {
  [K in keyof CustomOptions]: { key: K; labelKey: string; options: [CustomOptions[K], string][] }
}[keyof CustomOptions];

const CUSTOM_GROUPS: OptionGroup[] = [
  { key: 'header', labelKey: 'header', options: [['classic', 'classic'], ['split', 'split']] },
  { key: 'sectionStyle', labelKey: 'section', options: [['bar', 'bar'], ['underline', 'underline'], ['plain', 'plain']] },
  { key: 'experience', labelKey: 'experience', options: [['list', 'list'], ['timeline', 'timeline']] },
  { key: 'skillsStyle', labelKey: 'skills', options: [['list', 'list'], ['tags', 'tags']] },
  { key: 'skillsColumns', labelKey: 'cols', options: [[1, ''], [2, '']] },
  { key: 'education', labelKey: 'education', options: [['standard', 'standard'], ['compact', 'compact']] },
  { key: 'summary', labelKey: 'summary', options: [['paragraph', 'para'], ['callout', 'callout']] },
];

export function CustomOptionsBar({ options, onChange }: { options: CustomOptions; onChange: (o: CustomOptions) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-gray-200 dark:border-gray-700">
      {CUSTOM_GROUPS.map(group => (
        <div key={group.key} className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{t(`resumeLayout.preview.${group.labelKey}`)}:</span>
          {group.options.map(([value, labelKey]) => (
            <Chip
              key={String(value)}
              size="xs"
              active={options[group.key] === value}
              onClick={() => onChange({ ...options, [group.key]: value })}
            >
              {labelKey ? t(`resumeLayout.preview.${labelKey}`) : String(value)}
            </Chip>
          ))}
        </div>
      ))}
    </div>
  );
}
