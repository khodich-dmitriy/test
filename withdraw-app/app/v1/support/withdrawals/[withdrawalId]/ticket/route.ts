import { handleGetWithdrawalTicket } from '@/src/app/api/support/get-withdrawal-ticket-handler';

interface Props {
  params: Promise<{ withdrawalId: string }>;
}

export async function GET(request: Request, context: Props) {
  const { withdrawalId } = await context.params;
  return handleGetWithdrawalTicket(request, withdrawalId);
}
