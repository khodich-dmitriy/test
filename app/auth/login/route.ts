import { handleLogin } from '@/src/app/api/auth/login-handler';

export async function POST(request: Request) {
  return handleLogin(request);
}
