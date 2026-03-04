import Link from 'next/link';

import { AppRoute } from '@/src/shared/config/urls';
import styles from '@/src/views/home/ui/home-page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Withdraw Dashboard</h1>
        <p className={styles.text}>Create and track your USDT withdrawal request.</p>
        <Link href={AppRoute.WITHDRAW} className={styles.link}>
          Open withdraw form
        </Link>
      </section>
    </main>
  );
}
