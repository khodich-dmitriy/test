'use client';

import { useRouter } from 'next/navigation';

import { AppRoute, AuthApiRoute } from '@/src/shared/config/urls';
import buttonStyles from '@/src/shared/ui/button/button.module.css';

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className={`${buttonStyles.button} ${buttonStyles.ghost}`}
      onClick={async () => {
        try {
          await fetch(AuthApiRoute.LOGOUT, { method: 'POST' });
        } finally {
          router.push(AppRoute.LOGIN);
          router.refresh();
        }
      }}
    >
      Logout
    </button>
  );
}
