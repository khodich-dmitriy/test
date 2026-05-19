import './globals.css';

import type { ReactNode } from 'react';

import { getServerSupportSession } from '../src/entities/session/model/server-session';
import { AdminShell } from '../src/widgets/admin-shell/ui/admin-shell';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSupportSession();

  return (
    <html lang="en">
      <body>{session ? <AdminShell session={session}>{children}</AdminShell> : children}</body>
    </html>
  );
}
