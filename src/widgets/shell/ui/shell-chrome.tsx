'use client';

import { useEffect, useRef, useState } from 'react';

import { AppTheme } from '@/src/entities/theme/model/theme';
import { ShellTestId } from '@/src/shared/config/test-ids';
import { AuthApiRoute } from '@/src/shared/config/urls';
import AppFooter from '@/src/widgets/footer/ui/app-footer';
import AppHeader from '@/src/widgets/header/ui/app-header';
import styles from '@/src/widgets/header/ui/app-header.module.css';

const ACCESS_REFRESH_INTERVAL_MS = 45_000;
const ACTIVITY_REFRESH_THROTTLE_MS = 30_000;

interface ShellChromeProps {
  children: React.ReactNode;
  initialTheme: AppTheme;
  showLogout: boolean;
}

export default function ShellChrome({
  children,
  initialTheme,
  showLogout
}: ShellChromeProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isHeaderOverlayActive, setIsHeaderOverlayActive] = useState(false);
  const [isFooterOverlayActive, setIsFooterOverlayActive] = useState(false);

  useEffect(() => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    const syncOverlayState = () => {
      const nextHeaderOverlay = content.scrollTop > 0;
      const remainingBottom = content.scrollHeight - content.scrollTop - content.clientHeight;
      const nextFooterOverlay = remainingBottom > 0;

      setIsHeaderOverlayActive(nextHeaderOverlay);
      setIsFooterOverlayActive(nextFooterOverlay);
    };

    syncOverlayState();
    content.addEventListener('scroll', syncOverlayState, { passive: true });
    window.addEventListener('resize', syncOverlayState);

    return () => {
      content.removeEventListener('scroll', syncOverlayState);
      window.removeEventListener('resize', syncOverlayState);
    };
  }, []);

  useEffect(() => {
    if (!showLogout) {
      return;
    }

    let isDisposed = false;
    let isRefreshing = false;
    let lastRefreshAttemptAt = 0;

    const refreshAccessToken = async (source: 'timer' | 'activity') => {
      if (isDisposed || isRefreshing || document.visibilityState === 'hidden') {
        return;
      }

      const now = Date.now();
      if (source === 'activity' && now - lastRefreshAttemptAt < ACTIVITY_REFRESH_THROTTLE_MS) {
        return;
      }

      lastRefreshAttemptAt = now;
      isRefreshing = true;
      try {
        await fetch(AuthApiRoute.REFRESH, { method: 'POST' });
      } catch {
        // Best-effort refresh: failures should not break navigation flow.
      } finally {
        isRefreshing = false;
      }
    };

    const triggerRefreshByTimer = () => {
      void refreshAccessToken('timer');
    };

    const triggerRefreshByActivity = () => {
      void refreshAccessToken('activity');
    };

    const intervalId = window.setInterval(triggerRefreshByTimer, ACCESS_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', triggerRefreshByActivity);
    window.addEventListener('pointerdown', triggerRefreshByActivity, { passive: true });
    window.addEventListener('keydown', triggerRefreshByActivity);
    document.addEventListener('visibilitychange', triggerRefreshByActivity);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', triggerRefreshByActivity);
      window.removeEventListener('pointerdown', triggerRefreshByActivity);
      window.removeEventListener('keydown', triggerRefreshByActivity);
      document.removeEventListener('visibilitychange', triggerRefreshByActivity);
    };
  }, [showLogout]);

  return (
    <div className={styles.shell}>
      <AppHeader
        initialTheme={initialTheme}
        isOverlayActive={isHeaderOverlayActive}
        showLogout={showLogout}
      />
      <div
        className={styles.content}
        data-footer-overlay-active={isFooterOverlayActive}
        data-testid={ShellTestId.CONTENT}
        ref={contentRef}
      >
        {children}
      </div>
      <AppFooter isOverlayActive={isFooterOverlayActive} />
    </div>
  );
}
