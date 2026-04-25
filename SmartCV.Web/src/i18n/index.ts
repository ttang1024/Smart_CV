import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import es from './locales/es';
import zhCN from './locales/zh-CN';
import zhTW from './locales/zh-TW';

export const SUPPORTED_LANGUAGES = [
  { code: 'en',    label: 'English' },
  { code: 'es',    label: 'Español' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en:    { translation: en },
      es:    { translation: es },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'zh-CN', 'zh-TW'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
