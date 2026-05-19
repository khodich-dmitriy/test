'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { SupportAppRoute } from '../../../../shared/config/routes';
import styles from './login-form.module.css';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || 'Login failed');
      }

      router.replace(SupportAppRoute.USERS);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field} htmlFor="support-login-username">
        <span className={styles.label}>Username</span>
        <input
          id="support-login-username"
          className={styles.input}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
        />
      </label>
      <label className={styles.field} htmlFor="support-login-password">
        <span className={styles.label}>Password</span>
        <input
          id="support-login-password"
          className={styles.input}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </label>
      <div className={styles.footer}>
        {error && (
          <p className={styles.error} role="status">
            {error}
          </p>
        )}
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
      <p className={styles.note}>admin/admin123 or support/support123</p>
    </form>
  );
}
