import { AppRoute, RoutePrefix } from '@/src/shared/config/urls';

function isIgnoredPath(pathname: string): boolean {
  return pathname.startsWith(RoutePrefix.AUTH_API);
}

function isStubPath(pathname: string): boolean {
  return pathname === AppRoute.ROOT;
}

function isPublicPath(pathname: string): boolean {
  return pathname === AppRoute.STUB;
}

function isGuestOnlyPath(pathname: string): boolean {
  return pathname === AppRoute.LOGIN;
}

function isPrivatePath(pathname: string): boolean {
  return pathname === AppRoute.WITHDRAW || pathname.startsWith(`${AppRoute.WITHDRAW}/`);
}

export function resolveAuthRedirect(pathname: string, isAuthenticated: boolean): string | null {
  if (isIgnoredPath(pathname) || isPublicPath(pathname)) {
    return null;
  }

  if (isStubPath(pathname)) {
    return AppRoute.STUB;
  }

  if (!isAuthenticated && isPrivatePath(pathname)) {
    return AppRoute.LOGIN;
  }

  if (isAuthenticated && isGuestOnlyPath(pathname)) {
    return AppRoute.WITHDRAW;
  }

  return null;
}
