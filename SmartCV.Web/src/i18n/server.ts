import { createInstance } from 'i18next';
import { I18N_OPTIONS } from './config';
import type { LangCode } from './index';

// React Server Components can't load react-i18next, so prerendered pages (the landing
// page) translate with a plain i18next instance instead.
const serverI18n = createInstance();
void serverI18n.init({ ...I18N_OPTIONS, initAsync: false });

export const getServerT = (language: LangCode) => serverI18n.getFixedT(language);
