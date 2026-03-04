import Link from 'next/link';

import { AppTheme } from '@/src/entities/theme/model/theme';
import LogoutButton from '@/src/features/auth/logout/ui/logout-button';
import ThemeSwitcher from '@/src/features/theme/select/ui/theme-switcher';
import { AppRoute } from '@/src/shared/config/urls';
import styles from '@/src/widgets/header/ui/app-header.module.css';

interface AppHeaderProps {
  initialTheme: AppTheme;
}

export default function AppHeader({ initialTheme }: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href={AppRoute.WITHDRAW} className={styles.brand}>
          Fintech Withdraw
        </Link>
        <div className={styles.actions}>
          <ThemeSwitcher initialTheme={initialTheme} />
          <LogoutButton />
        </div>
      </nav>
    </header>
  );
}
