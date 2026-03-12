'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { AppRoute } from '@/src/shared/config/urls';
import styles from '@/src/views/stub/ui/stub-page.module.css';

export default function StubPage() {
  const { t } = useTranslation();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>{t('stub.eyebrow')}</p>
        <h1 className={styles.title}>{t('stub.title')}</h1>
        <p className={styles.text}>{t('stub.text')}</p>
        <div className={styles.actions}>
          <Link href={AppRoute.LOGIN} className={styles.primaryAction}>
            {t('stub.login')}
          </Link>
          <Link href={AppRoute.WITHDRAW} className={styles.secondaryAction}>
            {t('stub.withdraw')}
          </Link>
        </div>
      </section>
    </main>
  );
}
