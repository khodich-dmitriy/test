'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import type { SessionRole, SupportSession } from '../../../entities/session/model/auth';
import { SupportLogoutButton } from '../../../features/auth/logout/ui/support-logout-button';
import { SupportAppRoute } from '../../../shared/config/routes';
import styles from './admin-shell.module.css';

const navigationItems = [
  {
    href: SupportAppRoute.USERS,
    label: 'Users',
    roles: ['admin', 'support']
  },
  {
    href: SupportAppRoute.STAFF,
    label: 'Staff',
    roles: ['admin']
  }
] as const;

function canSeeNavItem(item: (typeof navigationItems)[number], role: SessionRole): boolean {
  return (item.roles as readonly SessionRole[]).includes(role);
}

export function AdminShell({
  session,
  children
}: {
  session: SupportSession;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>Support Admin</div>
          <div className={styles.brandSubtitle}>Operations console</div>
        </div>

        <nav className={styles.nav} aria-label="Admin navigation">
          {navigationItems
            .filter((item) => canSeeNavItem(item, session.role))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${pathname.startsWith(item.href) ? styles.navLinkActive : ''}`}
                aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
        </nav>
      </aside>

      <div className={styles.frame}>
        <header className={styles.topbar}>
          <div className={styles.context} aria-label="Support session context">
            <span className={styles.contextLabel}>Signed in as</span>
            <span className={styles.contextValue}>
              <span>{session.username}</span>
              <span className={styles.roleBadge}>{session.role}</span>
            </span>
          </div>

          <div className={styles.logout}>
            <SupportLogoutButton />
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
