import '@testing-library/jest-dom/vitest';

import { afterEach } from 'vitest';

import { resetSystemDb } from '@/shared/mock/system-db';
import { initI18n } from '@/src/shared/i18n/client';
import { AppLanguage } from '@/src/shared/i18n/config';

process.env.MOCK_SYSTEM_DB_FILE_PATH = `/tmp/testfront-shared-mock-db-${process.pid}-${process.env.VITEST_POOL_ID || 'main'}.json`;

afterEach(() => {
  resetSystemDb();
  initI18n(AppLanguage.RU);
  document.documentElement.lang = AppLanguage.RU;
  document.cookie = '';
});
