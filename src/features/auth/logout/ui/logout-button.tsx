'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { logout } from '@/src/entities/session/api/auth-api';
import { AppRoute } from '@/src/shared/config/urls';
import Button from '@/src/shared/ui/button/button';

export default function LogoutButton() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={async () => {
        try {
          await logout();
        } finally {
          router.push(AppRoute.LOGIN);
          router.refresh();
        }
      }}
    >
      {t('header.logout')}
    </Button>
  );
}
