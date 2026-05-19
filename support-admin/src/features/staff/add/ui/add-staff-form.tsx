'use client';

import { useState } from 'react';

import styles from './add-staff-form.module.css';

interface Props {
  onCreated?: () => void;
}

export function AddStaffForm({ onCreated }: Props) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/v1/support/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || 'Failed to add support user');
      }
      setUsername('');
      onCreated?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field} htmlFor="support-username">
        <span className={styles.label}>Support username</span>
        <input
          id="support-username"
          className={styles.input}
          placeholder="support username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
        />
      </label>
      <div className={styles.footer}>
        {error && (
          <span className={styles.error} role="status">
            {error}
          </span>
        )}
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add support'}
        </button>
      </div>
    </form>
  );
}
