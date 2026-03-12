'use client';

import { useTranslation } from 'react-i18next';

import { FooterTestId } from '@/src/shared/config/test-ids';
import styles from '@/src/widgets/footer/ui/app-footer.module.css';

export default function AppFooter({ isOverlayActive = false }: { isOverlayActive?: boolean }) {
  const { t } = useTranslation();

  return (
    <footer
      className={`${styles.footer} ${isOverlayActive ? styles.overlayActive : ''}`}
      data-overlay-active={isOverlayActive}
      data-testid={FooterTestId.ROOT}
    >
      <div className={styles.inner}>
        <div className={styles.block}>
          <p className={styles.copy}>{t('footer.title')}</p>
          <p className={styles.meta}>{t('footer.description')}</p>
        </div>
        <div className={styles.block}>
          <p className={styles.label}>{t('footer.support')}</p>
          <p className={styles.meta}>{t('footer.supportDescription')}</p>
        </div>
      </div>
    </footer>
  );
}
