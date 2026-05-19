import Link from 'next/link';

import { LoginForm } from '../../../features/auth/login/ui/login-form';
import styles from './login-page.module.css';

export function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="login-page-title">
        <p className={styles.kicker}>Operations console</p>
        <h1 className={styles.title} id="login-page-title">
          Support Admin Login
        </h1>
        <p className={styles.subtitle}>
          Sign in to manage users, staff accounts, and incoming support work.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="login-form-title">
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle} id="login-form-title">
            Secure sign in
          </h2>
          <p className={styles.cardSubtitle}>
            Use the shared admin or support credentials to access the console.
          </p>
        </div>
        <LoginForm />
        <p className={styles.note}>
          Need to move back to the public area?{' '}
          <Link className={styles.backLink} href="/">
            Return home
          </Link>
        </p>
      </section>
    </main>
  );
}
