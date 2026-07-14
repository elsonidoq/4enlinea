import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import es from './es.json';
import { readStoredLang } from '../lib/useLanguage.js';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: readStoredLang('en'),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
