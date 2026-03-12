export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Withdrawal {
  id: string;
  amount: number;
  destination: string;
  status: WithdrawalStatus;
  created_at: string;
}

export interface CreateWithdrawalRequest {
  amount: number;
  destination: string;
  idempotency_key: string;
}

export interface WithdrawalFeedResponse {
  items: Withdrawal[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiErrorPayload {
  message: string;
}
