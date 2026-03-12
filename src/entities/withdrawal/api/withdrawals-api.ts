import type {
  CreateWithdrawalRequest,
  Withdrawal,
  WithdrawalFeedResponse} from '@/src/entities/withdrawal/model/types';
import {
  isApiHttpError,
  isApiNetworkError,
  request,
  requestJson
} from '@/src/shared/api/http-client';
import {
  createWithdrawFeedApiUrl,
  getWithdrawalByIdApiRoute,
  WithdrawalApiRoute
} from '@/src/shared/config/urls';
import { translate } from '@/src/shared/i18n/client';

export interface WithdrawApiError {
  kind: 'http';
  status: number;
  message: string;
}

export interface WithdrawNetworkError {
  kind: 'network';
  message: string;
}

function throwMappedWithdrawError(error: unknown): never {
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

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message || translate('withdraw.error.fallback');
  } catch {
    return translate('withdraw.error.fallback');
  }
}

async function requestWithdrawalJson<T>(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<T> {
  try {
    return await requestJson<T>(input, init, { retryOnUnauthorized: true });
  } catch (error) {
    throwMappedWithdrawError(error);
  }
}

async function requestWithdrawalVoid(input: RequestInfo | URL, init: RequestInit): Promise<void> {
  try {
    const response = await request(input, init, { retryOnUnauthorized: true });

    if (!response.ok) {
      throw {
        kind: 'http',
        status: response.status,
        message: await parseErrorMessage(response)
      } satisfies WithdrawApiError;
    }
  } catch (error) {
    throwMappedWithdrawError(error);
  }
}

export async function postWithdrawal(payload: CreateWithdrawalRequest): Promise<Withdrawal> {
  return requestWithdrawalJson<Withdrawal>(WithdrawalApiRoute.LIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchWithdrawal(id: string): Promise<Withdrawal> {
  return requestWithdrawalJson<Withdrawal>(getWithdrawalByIdApiRoute(id), { method: 'GET' });
}

export async function fetchWithdrawalsFeed(
  cursor: string | null,
  limit = 20
): Promise<WithdrawalFeedResponse> {
  const url = new URL(createWithdrawFeedApiUrl(cursor, limit));

  return requestWithdrawalJson<WithdrawalFeedResponse>(`${WithdrawalApiRoute.FEED}${url.search}`, {
    method: 'GET'
  });
}

export async function removeWithdrawal(id: string): Promise<void> {
  return requestWithdrawalVoid(getWithdrawalByIdApiRoute(id), { method: 'DELETE' });
}
