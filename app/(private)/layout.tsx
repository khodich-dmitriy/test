import { cookies } from 'next/headers';

import { resolveAppTheme, THEME_COOKIE_NAME } from '@/src/entities/theme/model/theme';
import AppHeader from '@/src/widgets/header/ui/app-header';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const currentTheme = resolveAppTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <>
      <AppHeader initialTheme={currentTheme} />
      {children}
    </>
  );
}
