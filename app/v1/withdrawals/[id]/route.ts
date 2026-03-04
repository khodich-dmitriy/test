import { handleGetWithdrawalById } from '@/src/app/api/withdrawals/get-withdrawal-by-id-handler';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handleGetWithdrawalById(request, params.id);
}
