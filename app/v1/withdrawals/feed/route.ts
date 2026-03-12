import { handleListWithdrawalsFeed } from '@/src/app/api/withdrawals/list-withdrawals-feed-handler';

export async function GET(request: Request) {
  return handleListWithdrawalsFeed(request);
}
