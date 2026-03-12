import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  AppLanguage,
  DEFAULT_APP_LANGUAGE
} from '@/src/shared/i18n/config';
import { resources } from '@/src/shared/i18n/resources';

let initialized = false;

export function initI18n(language = DEFAULT_APP_LANGUAGE) {
  if (!initialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: DEFAULT_APP_LANGUAGE,
      supportedLngs: Object.values(AppLanguage),
      defaultNS: 'translation',
      interpolation: {
        escapeValue: false
      },
      react: {
        useSuspense: false
      },
      initImmediate: false
    });

    initialized = true;
  }

  if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }

  return i18n;
}

export function translate(key: string, options?: Record<string, unknown>) {
  return initI18n().t(key, options);
}

initI18n();

export { i18n };
