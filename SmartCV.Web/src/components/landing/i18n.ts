import en from '../../i18n/locales/en';
import es from '../../i18n/locales/es';
import zhCN from '../../i18n/locales/zh-CN';
import zhTW from '../../i18n/locales/zh-TW';

const LANDING_MESSAGES = {
  en,
  es,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
} as const;

export type LandingLanguage = keyof typeof LANDING_MESSAGES;

type LandingMessages = Record<string, unknown>;
export type TranslationParams = Record<string, string | number>;

/** Bound translator passed down to the landing sections. */
export type Translate = (key: string, params?: TranslationParams) => string;

function readTranslation(messages: LandingMessages, key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => (
    current && typeof current === 'object'
      ? (current as Record<string, unknown>)[part]
      : undefined
  ), messages);

  return typeof value === 'string' ? value : key;
}

function translate(messages: LandingMessages, key: string, params?: TranslationParams) {
  const value = readTranslation(messages, key);

  if (!params) {
    return value;
  }

  return Object.entries(params).reduce(
    (text, [param, replacement]) => text.replaceAll(`{{${param}}}`, String(replacement)),
    value,
  );
}

/** Creates a translator bound to the given landing language. */
export function createTranslator(language: LandingLanguage): Translate {
  const messages = LANDING_MESSAGES[language];
  return (key, params) => translate(messages, key, params);
}
