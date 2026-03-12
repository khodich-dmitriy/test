export enum AppRoute {
  ROOT = '/',
  LOGIN = '/login',
  STUB = '/stub',
  WITHDRAW = '/withdraw'
}

export enum AuthApiRoute {
  LOGIN = '/auth/login',
  LOGOUT = '/auth/logout',
  REFRESH = '/auth/refresh'
}

export enum WithdrawalApiRoute {
  LIST = '/v1/withdrawals',
  FEED = '/v1/withdrawals/feed'
}

export enum RoutePrefix {
  AUTH_API = '/auth/'
}

export const APP_TEST_ORIGIN = 'http://localhost';

export function getWithdrawDetailsRoute(id: string): string {
  return `${AppRoute.WITHDRAW}/${id}`;
}

export function getWithdrawalByIdApiRoute(id: string): string {
  return `${WithdrawalApiRoute.LIST}/${id}`;
}

export function createAppUrl(path: string): string {
  return new URL(path, APP_TEST_ORIGIN).toString();
}

export function createWithdrawFeedApiUrl(cursor: string | null, limit = 20): string {
  const url = new URL(WithdrawalApiRoute.FEED, APP_TEST_ORIGIN);
  url.searchParams.set('limit', String(limit));

  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }

  return url.toString();
}
