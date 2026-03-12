'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { HomePageTestId } from '@/src/shared/config/test-ids';
import { AppRoute } from '@/src/shared/config/urls';
import styles from '@/src/views/home/ui/home-page.module.css';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title} data-testid={HomePageTestId.TITLE}>
          {t('home.title')}
        </h1>
        <p className={styles.text}>{t('home.text')}</p>
        <Link href={AppRoute.WITHDRAW} className={styles.link}>
          {t('home.action')}
        </Link>
      </section>
    </main>
  );
}
