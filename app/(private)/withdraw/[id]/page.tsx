import { getWithdrawalById } from '@/src/entities/withdrawal/model/mock-withdrawal-store';
import WithdrawDetailsPage from '@/src/views/withdraw-details/ui/withdraw-details-page';

export default async function WithdrawDetailsRoutePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const withdrawal = getWithdrawalById(id);

  return <WithdrawDetailsPage withdrawal={withdrawal} />;
}
