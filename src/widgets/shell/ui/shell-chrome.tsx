'use client';

import { usePathname } from 'next/navigation';
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from 'react';

import { AppTheme } from '@/src/entities/theme/model/theme';
import { ShellTestId } from '@/src/shared/config/test-ids';
import { AuthApiRoute } from '@/src/shared/config/urls';
import AppFooter from '@/src/widgets/footer/ui/app-footer';
import AppHeader from '@/src/widgets/header/ui/app-header';
import styles from '@/src/widgets/header/ui/app-header.module.css';

const ACCESS_REFRESH_INTERVAL_MS = 45_000;
const ACTIVITY_REFRESH_THROTTLE_MS = 30_000;

interface ShellChromeProps {
  children: ReactNode;
  initialTheme: AppTheme;
  showLogout: boolean;
}

export default function ShellChrome({
  children,
  initialTheme,
  showLogout
}: ShellChromeProps) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const headerOverlayRef = useRef(false);
  const footerOverlayRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const [isHeaderOverlayActive, setIsHeaderOverlayActive] = useState(false);
  const [isFooterOverlayActive, setIsFooterOverlayActive] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    const syncOverlayState = () => {
      const nextHeaderOverlay = content.scrollTop > 0;
      const remainingBottom = content.scrollHeight - content.scrollTop - content.clientHeight;
      const nextFooterOverlay = remainingBottom > 0;

      if (headerOverlayRef.current !== nextHeaderOverlay) {
        headerOverlayRef.current = nextHeaderOverlay;
        setIsHeaderOverlayActive(nextHeaderOverlay);
      }

      if (footerOverlayRef.current !== nextFooterOverlay) {
        footerOverlayRef.current = nextFooterOverlay;
        setIsFooterOverlayActive(nextFooterOverlay);
      }
    };

    const scheduleOverlaySync = () => {
      if (scrollFrameRef.current !== null) {
        return;
      }

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        syncOverlayState();
      });
    };

    syncOverlayState();
    content.addEventListener('scroll', scheduleOverlaySync, { passive: true });
    window.addEventListener('resize', scheduleOverlaySync);

    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
      content.removeEventListener('scroll', scheduleOverlaySync);
      window.removeEventListener('resize', scheduleOverlaySync);
    };
  }, []);

  useEffect(() => {
    if (!showLogout) {
      return;
    }

    let isDisposed = false;
    let isRefreshing = false;
    let lastRefreshAttemptAt = 0;

    const refreshAccessToken = async (source: 'timer' | 'activity' | 'startup') => {
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

    const isLinkPointerActivity = (event: Event) => {
      if (event.type !== 'pointerdown' || !(event.target instanceof Element)) {
        return false;
      }

      return Boolean(event.target.closest('a[href]'));
    };

    const triggerRefreshByActivity = (event: Event) => {
      if (isLinkPointerActivity(event)) {
        return;
      }

      void refreshAccessToken('activity');
    };

    void refreshAccessToken('startup');

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

  const startNavigationFeedback = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = (event.target as Element | null)?.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute('download')) {
      return;
    }

    const nextUrl = new URL(link.href);
    if (nextUrl.origin !== window.location.origin) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    if (`${nextUrl.pathname}${nextUrl.search}` === `${currentUrl.pathname}${currentUrl.search}`) {
      return;
    }

    setIsNavigating(true);
  };

  return (
    <div className={styles.shell} onClickCapture={startNavigationFeedback}>
      {isNavigating ? (
        <div
          className={styles.navigationProgress}
          data-testid={ShellTestId.NAVIGATION_PROGRESS}
          role="status"
          aria-label="Page is loading"
        />
      ) : null}
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
