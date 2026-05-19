import { redirect } from 'next/navigation';

import { getServerSupportSession } from '../../../src/entities/session/model/server-session';
import { getSupportUserById, listTicketsByUserId } from '../../../src/entities/support/model/support-store';
import { UserDetailsPage } from '../../../src/views/user-details/ui/user-details-page';

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function UserDetailsRoutePage({ params }: Props) {
  const session = await getServerSupportSession();
  if (!session) {
    redirect('/login');
  }

  const { userId } = await params;
  return <UserDetailsPage user={getSupportUserById(userId)} tickets={listTicketsByUserId(userId)} />;
}
