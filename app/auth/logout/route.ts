import { handleLogout } from '@/src/app/api/auth/logout-handler';

export async function POST() {
  return handleLogout();
}
