export enum AppRoute {
  ROOT = '/',
  LOGIN = '/login',
  WITHDRAW = '/withdraw'
}

export enum AuthApiRoute {
  LOGIN = '/auth/login',
  LOGOUT = '/auth/logout',
  REFRESH = '/auth/refresh'
}

export enum WithdrawalApiRoute {
  LIST = '/v1/withdrawals'
}

export enum RoutePrefix {
  AUTH_API = '/auth/'
}

export function getWithdrawDetailsRoute(id: string): string {
  return `${AppRoute.WITHDRAW}/${id}`;
}

export function getWithdrawalByIdApiRoute(id: string): string {
  return `${WithdrawalApiRoute.LIST}/${id}`;
}
