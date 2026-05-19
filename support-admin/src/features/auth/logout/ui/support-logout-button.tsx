'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SupportLogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setError(null);

    try {
      const response = await fetch('/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Logout failed');
      }

      router.replace('/login');
      router.refresh();
    } catch {
      setError('Failed to logout. Please retry.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => void handleLogout()} disabled={loggingOut}>
        {loggingOut ? 'Logging out...' : 'Logout'}
      </button>
      {error ? <p role="status">{error}</p> : null}
    </>
  );
}
