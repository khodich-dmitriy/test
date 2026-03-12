'use client';

import { ChangeEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AppTheme,
  createThemeCookie,
  isAppTheme
} from '@/src/entities/theme/model/theme';
import styles from '@/src/features/theme/select/ui/theme-switcher.module.css';
import { ThemeTestId } from '@/src/shared/config/test-ids';
import Select from '@/src/shared/ui/select/select';

interface ThemeSwitcherProps {
  initialTheme: AppTheme;
}

export default function ThemeSwitcher({ initialTheme }: ThemeSwitcherProps) {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<AppTheme>(initialTheme);
  const options = [
    { value: AppTheme.FINTECH_LIGHT, label: t('header.themes.fintech') },
    { value: AppTheme.OCEAN_BREEZE, label: t('header.themes.ocean') },
    { value: AppTheme.MINT_GLASS, label: t('header.themes.mint') }
  ];

  const applyTheme = (nextTheme: AppTheme) => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.cookie = createThemeCookie(nextTheme);
  };

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextTheme = event.target.value;
    if (!isAppTheme(nextTheme)) {
      return;
    }

    applyTheme(nextTheme);
  };

  return (
    <div className={styles.wrap}>
      <label htmlFor="theme-select" className={styles.label}>
        {t('header.theme')}
      </label>
      <Select
        id="theme-select"
        aria-label={t('header.theme')}
        data-testid={ThemeTestId.SELECT}
        value={theme}
        options={options}
        onChange={onChange}
      />
    </div>
  );
}
