import { handleCreateWithdrawal } from '@/src/app/api/withdrawals/create-withdrawal-handler';

export async function POST(request: Request) {
  return handleCreateWithdrawal(request);
}
