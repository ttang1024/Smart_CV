import type { InitOptions } from 'i18next';
import en from './locales/en';
import es from './locales/es';
import zhCN from './locales/zh-CN';
import zhTW from './locales/zh-TW';

/** Shared by the client instance (index.ts) and the server-side one (server.ts). */
export const I18N_OPTIONS: InitOptions = {
  resources: {
    en: { translation: en },
    es: { translation: es },
    'zh-CN': { translation: zhCN },
    'zh-TW': { translation: zhTW },
  },
  fallbackLng: 'en',
  supportedLngs: ['en', 'es', 'zh-CN', 'zh-TW'],
  interpolation: { escapeValue: false },
};
