'use client';

import { useEffect, useRef, useState } from 'react';

import { AppTheme } from '@/src/entities/theme/model/theme';
import { ShellTestId } from '@/src/shared/config/test-ids';
import AppFooter from '@/src/widgets/footer/ui/app-footer';
import AppHeader from '@/src/widgets/header/ui/app-header';
import styles from '@/src/widgets/header/ui/app-header.module.css';

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
