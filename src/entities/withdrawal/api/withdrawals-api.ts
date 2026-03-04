import type {
  ApiErrorPayload,
  CreateWithdrawalRequest,
  Withdrawal
} from '@/src/entities/withdrawal/model/types';
import {
  AuthApiRoute,
  getWithdrawalByIdApiRoute,
  WithdrawalApiRoute
} from '@/src/shared/config/urls';

export class WithdrawApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'WithdrawApiError';
    this.status = status;
  }
}

export class WithdrawNetworkError extends Error {
  constructor(message = 'Network error. Please try again.') {
    super(message);
    this.name = 'WithdrawNetworkError';
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiErrorPayload;
    return data.message || 'Request failed';
  } catch {
    return 'Request failed';
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(AuthApiRoute.REFRESH, {
      method: 'POST'
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function requestWithRefreshRetry(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    throw new WithdrawNetworkError();
  }

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return response;
  }

  try {
    return await fetch(input, init);
  } catch {
    throw new WithdrawNetworkError();
  }
}

export async function postWithdrawal(payload: CreateWithdrawalRequest): Promise<Withdrawal> {
  const response = await requestWithRefreshRetry(WithdrawalApiRoute.LIST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new WithdrawApiError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as Withdrawal;
}

export async function fetchWithdrawal(id: string): Promise<Withdrawal> {
  const response = await requestWithRefreshRetry(getWithdrawalByIdApiRoute(id), {
    method: 'GET'
  });

  if (!response.ok) {
    throw new WithdrawApiError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as Withdrawal;
}
