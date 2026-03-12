'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import { initI18n } from '@/src/shared/i18n/client';
import type { AppLanguage } from '@/src/shared/i18n/config';

interface I18nProviderProps {
  children: React.ReactNode;
  initialLanguage: AppLanguage;
}

export default function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const instance = initI18n(initialLanguage);

  useEffect(() => {
    void instance.changeLanguage(initialLanguage);
    document.documentElement.lang = initialLanguage;
  }, [initialLanguage, instance]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
