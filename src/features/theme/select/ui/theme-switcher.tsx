'use client';

import { ChangeEvent, useState } from 'react';

import {
  AppTheme,
  createThemeCookie,
  isAppTheme,
  THEME_OPTIONS
} from '@/src/entities/theme/model/theme';
import styles from '@/src/features/theme/select/ui/theme-switcher.module.css';
import { ThemeTestId } from '@/src/shared/config/test-ids';
import Select from '@/src/shared/ui/select/select';

interface ThemeSwitcherProps {
  initialTheme: AppTheme;
}

export default function ThemeSwitcher({ initialTheme }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

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
        Theme
      </label>
      <Select
        id="theme-select"
        data-testid={ThemeTestId.SELECT}
        value={theme}
        options={THEME_OPTIONS}
        onChange={onChange}
      />
    </div>
  );
}
