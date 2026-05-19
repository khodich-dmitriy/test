import { handleDeleteWithdrawal } from '@/src/app/api/withdrawals/delete-withdrawal-handler';
import { handleGetWithdrawalById } from '@/src/app/api/withdrawals/get-withdrawal-by-id-handler';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleGetWithdrawalById(request, id);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleDeleteWithdrawal(request, id);
}
