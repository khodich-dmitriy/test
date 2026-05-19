import { redirect } from 'next/navigation';

import { getServerSupportSession } from '../../src/entities/session/model/server-session';
import { listSupportUsers } from '../../src/entities/support/model/support-store';
import { UsersPage } from '../../src/views/users/ui/users-page';

export default async function UsersRoutePage() {
  const session = await getServerSupportSession();
  if (!session) {
    redirect('/login');
  }

  return <UsersPage users={listSupportUsers()} />;
}
