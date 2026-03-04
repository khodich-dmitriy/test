import { AppRoute, RoutePrefix } from '@/src/shared/config/urls';

function isPublicPath(pathname: string): boolean {
  return pathname === AppRoute.LOGIN || pathname.startsWith(RoutePrefix.AUTH_API);
}

export function resolveAuthRedirect(pathname: string, isAuthenticated: boolean): string | null {
  if (!isAuthenticated && !isPublicPath(pathname)) {
    return AppRoute.LOGIN;
  }

  if (isAuthenticated && pathname === AppRoute.LOGIN) {
    return AppRoute.WITHDRAW;
  }

  return null;
}
