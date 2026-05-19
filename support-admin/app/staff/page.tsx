import { redirect } from 'next/navigation';

import { getServerSupportSession } from '../../src/entities/session/model/server-session';
import { listSupportStaff } from '../../src/entities/support/model/support-store';
import { StaffPage } from '../../src/views/staff/ui/staff-page';

export default async function StaffRoutePage() {
  const session = await getServerSupportSession();
  if (!session) {
    redirect('/login');
  }
  if (session.role !== 'admin') {
    redirect('/users');
  }

  return <StaffPage initialStaff={listSupportStaff()} />;
}
