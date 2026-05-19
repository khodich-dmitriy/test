import { redirect } from 'next/navigation';

import { getServerSupportSession } from '../src/entities/session/model/server-session';

export default async function HomePage() {
  const session = await getServerSupportSession();
  if (!session) {
    redirect('/login');
  }

  redirect('/users');
}
