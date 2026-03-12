import '@testing-library/jest-dom/vitest';

import { afterEach } from 'vitest';

import { initI18n } from '@/src/shared/i18n/client';
import { AppLanguage } from '@/src/shared/i18n/config';

afterEach(() => {
  initI18n(AppLanguage.RU);
  document.documentElement.lang = AppLanguage.RU;
  document.cookie = '';
});
