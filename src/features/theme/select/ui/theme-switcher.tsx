'use client';

import { ChangeEvent, useState } from 'react';

import {
  AppTheme,
  THEME_COOKIE_NAME,
  THEME_COOKIE_OPTIONS,
  THEME_OPTIONS
} from '@/src/entities/theme/model/theme';
import styles from '@/src/features/theme/select/ui/theme-switcher.module.css';
import { ThemeTestId } from '@/src/shared/config/test-ids';

interface ThemeSwitcherProps {
  initialTheme: AppTheme;
}

export default function ThemeSwitcher({ initialTheme }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  const applyTheme = (nextTheme: AppTheme) => {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.cookie = `${THEME_COOKIE_NAME}=${nextTheme}; path=${THEME_COOKIE_OPTIONS.path}; max-age=${THEME_COOKIE_OPTIONS.maxAge}; samesite=${THEME_COOKIE_OPTIONS.sameSite}`;
  };

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    applyTheme(event.target.value as AppTheme);
  };

  return (
    <div className={styles.wrap}>
      <label htmlFor="theme-select" className={styles.label}>
        Theme
      </label>
      <select
        id="theme-select"
        data-testid={ThemeTestId.SELECT}
        value={theme}
        className={styles.select}
        onChange={onChange}
      >
        {THEME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
