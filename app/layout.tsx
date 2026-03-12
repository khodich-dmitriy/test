import './globals.css';

import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { resolveAppTheme, THEME_COOKIE_NAME } from '@/src/entities/theme/model/theme';
import {
  LANGUAGE_COOKIE_NAME,
  resolveAppLanguage
} from '@/src/shared/i18n/config';
import I18nProvider from '@/src/shared/i18n/provider';

export const metadata: Metadata = {
  title: 'Withdraw Demo',
  description: 'Withdraw flow demo app'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const currentTheme = resolveAppTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);
  const currentLanguage = resolveAppLanguage(cookieStore.get(LANGUAGE_COOKIE_NAME)?.value);

  return (
    <html lang={currentLanguage} data-theme={currentTheme}>
      <body>
        <I18nProvider initialLanguage={currentLanguage}>{children}</I18nProvider>
      </body>
    </html>
  );
}
