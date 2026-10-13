import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18N_OPTIONS } from './config';

export const SUPPORTED_LANGUAGES = [
  { code: 'en',    label: 'English' },
  { code: 'es',    label: 'Español' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
  .use(initReactI18next)
  .init({ ...I18N_OPTIONS, lng: 'en' });

export default i18n;
