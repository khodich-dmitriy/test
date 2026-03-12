import { cookies } from 'next/headers';

import { resolveAppTheme, THEME_COOKIE_NAME } from '@/src/entities/theme/model/theme';
import ShellChrome from '@/src/widgets/shell/ui/shell-chrome';

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const currentTheme = resolveAppTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return <ShellChrome initialTheme={currentTheme} showLogout>{children}</ShellChrome>;
}
