'use client';

import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import styles from '@/src/features/language/select/ui/language-switcher.module.css';
import { LanguageTestId } from '@/src/shared/config/test-ids';
import {
  APP_LANGUAGE_OPTIONS,
  createLanguageCookie,
  isAppLanguage,
  resolveAppLanguage
} from '@/src/shared/i18n/config';
import Select from '@/src/shared/ui/select/select';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value;

    if (!isAppLanguage(nextLanguage)) {
      return;
    }

    void i18n.changeLanguage(nextLanguage);
    document.cookie = createLanguageCookie(nextLanguage);
    document.documentElement.lang = nextLanguage;
  };

  return (
    <div className={styles.wrap}>
      <label htmlFor="language-select" className={styles.label}>
        {t('header.language')}
      </label>
      <Select
        id="language-select"
        aria-label={t('header.language')}
        data-testid={LanguageTestId.SELECT}
        value={resolveAppLanguage(i18n.resolvedLanguage)}
        options={APP_LANGUAGE_OPTIONS.map((option) => ({
          ...option
        }))}
        onChange={onChange}
      />
    </div>
  );
}
