import { handleRefresh } from '@/src/app/api/auth/refresh-handler';

export async function POST(request: Request) {
  return handleRefresh(request);
}
