import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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
  .use(initReactI18next)
  .init({
    resources: {
      en:    { translation: en },
      es:    { translation: es },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
    },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'zh-CN', 'zh-TW'],
    interpolation: { escapeValue: false },
  });

export default i18n;
