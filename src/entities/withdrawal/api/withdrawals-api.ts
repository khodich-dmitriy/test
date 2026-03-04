import type {
  CreateWithdrawalRequest,
  Withdrawal
} from '@/src/entities/withdrawal/model/types';
import {
  isApiHttpError,
  isApiNetworkError,
  requestJson
} from '@/src/shared/api/http-client';
import { getWithdrawalByIdApiRoute, WithdrawalApiRoute } from '@/src/shared/config/urls';

export interface WithdrawApiError {
  kind: 'http';
  status: number;
  message: string;
}

export interface WithdrawNetworkError {
  kind: 'network';
  message: string;
}

function mapWithdrawError(error: unknown): never {
  if (isApiHttpError(error)) {
    throw {
      kind: 'http',
      status: error.status,
      message: error.message
    } satisfies WithdrawApiError;
  }

  if (isApiNetworkError(error)) {
    throw {
      kind: 'network',
      message: error.message
    } satisfies WithdrawNetworkError;
  }

  throw error;
}

export async function postWithdrawal(payload: CreateWithdrawalRequest): Promise<Withdrawal> {
  try {
    return await requestJson<Withdrawal>(
      WithdrawalApiRoute.LIST,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      { retryOnUnauthorized: true }
    );
  } catch (error) {
    mapWithdrawError(error);
  }
}

export async function fetchWithdrawal(id: string): Promise<Withdrawal> {
  try {
    return await requestJson<Withdrawal>(
      getWithdrawalByIdApiRoute(id),
      { method: 'GET' },
      { retryOnUnauthorized: true }
    );
  } catch (error) {
    mapWithdrawError(error);
  }
}
