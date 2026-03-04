import './globals.css';

import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { resolveAppTheme, THEME_COOKIE_NAME } from '@/src/entities/theme/model/theme';

export const metadata: Metadata = {
  title: 'Withdraw Demo',
  description: 'Withdraw flow demo app'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const currentTheme = resolveAppTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html lang="en" data-theme={currentTheme}>
      <body>{children}</body>
    </html>
  );
}
