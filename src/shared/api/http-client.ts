import { AuthApiRoute } from '@/src/shared/config/urls';

export interface ApiHttpError {
  kind: 'http';
  status: number;
  message: string;
}

export interface ApiNetworkError {
  kind: 'network';
  message: string;
}

export type ApiRequestError = ApiHttpError | ApiNetworkError;

function createApiHttpError(status: number, message: string): ApiHttpError {
  return { kind: 'http', status, message };
}

function createApiNetworkError(message = 'Network error. Please try again.'): ApiNetworkError {
  return { kind: 'network', message };
}

export function isApiHttpError(error: unknown): error is ApiHttpError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Partial<ApiHttpError>).kind === 'http' &&
    typeof (error as Partial<ApiHttpError>).status === 'number'
  );
}

export function isApiNetworkError(error: unknown): error is ApiNetworkError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Partial<ApiNetworkError>).kind === 'network'
  );
}

interface RequestOptions {
  retryOnUnauthorized?: boolean;
}

interface ApiErrorPayload {
  message?: string;
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
    const response = await fetch(AuthApiRoute.REFRESH, { method: 'POST' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function request(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestOptions = {}
): Promise<Response> {
  const { retryOnUnauthorized = false } = options;

  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw createApiNetworkError();
  }

  if (response.status !== 401 || !retryOnUnauthorized) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return response;
  }

  try {
    return await fetch(input, init);
  } catch {
    throw createApiNetworkError();
  }
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RequestOptions = {}
): Promise<T> {
  const response = await request(input, init, options);
  if (!response.ok) {
    throw createApiHttpError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as T;
}
