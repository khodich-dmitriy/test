'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { AppTheme } from '@/src/entities/theme/model/theme';
import LogoutButton from '@/src/features/auth/logout/ui/logout-button';
import LanguageSwitcher from '@/src/features/language/select/ui/language-switcher';
import ThemeSwitcher from '@/src/features/theme/select/ui/theme-switcher';
import { HeaderTestId } from '@/src/shared/config/test-ids';
import { AppRoute } from '@/src/shared/config/urls';
import styles from '@/src/widgets/header/ui/app-header.module.css';

interface AppHeaderProps {
  initialTheme: AppTheme;
  isOverlayActive?: boolean;
  showLogout?: boolean;
}

export default function AppHeader({
  initialTheme,
  isOverlayActive = false,
  showLogout = true
}: AppHeaderProps) {
  const { t } = useTranslation();

  return (
    <header
      className={`${styles.header} ${isOverlayActive ? styles.overlayActive : ''}`}
      data-overlay-active={isOverlayActive}
      data-testid={HeaderTestId.ROOT}
    >
      <nav className={styles.nav}>
        <Link href={AppRoute.WITHDRAW} className={styles.brand}>
          <span data-testid={HeaderTestId.BRAND}>{t('header.brand')}</span>
        </Link>
        <div className={styles.actions}>
          <LanguageSwitcher />
          <ThemeSwitcher initialTheme={initialTheme} />
          {showLogout ? <LogoutButton /> : null}
        </div>
      </nav>
    </header>
  );
}
