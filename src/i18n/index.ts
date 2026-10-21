import i18n from 'i18next';
import * as Localization from 'expo-localization';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import es from '../locales/es.json';
import pt from '../locales/pt.json';

const resolveLanguage = (): 'pt-BR' | 'en' | 'es' => {
  const deviceTag = Localization.getLocales()[0]?.languageTag?.toLowerCase() || 'pt-br';

  if (deviceTag.startsWith('en')) {
    return 'en';
  }

  if (deviceTag.startsWith('es')) {
    return 'es';
  }

  return 'pt-BR';
};

void i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      'pt-BR': { translation: pt },
      en: { translation: en },
      es: { translation: es },
    },
    lng: resolveLanguage(),
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
