import { NextRequest, NextResponse } from 'next/server';

import { resolveAuthRedirect } from '@/src/entities/session/lib/auth-redirect';
import { hasActiveSessionCookie } from '@/src/entities/session/model/auth';

function withNoStoreHeaders(response: NextResponse): NextResponse {
  response.headers.set('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('pragma', 'no-cache');
  response.headers.set('expires', '0');
  return response;
}

export function middleware(request: NextRequest) {
  const isAuthenticated = hasActiveSessionCookie(request.headers.get('cookie'));
  const redirectPath = resolveAuthRedirect(request.nextUrl.pathname, isAuthenticated);

  if (!redirectPath) {
    return withNoStoreHeaders(NextResponse.next());
  }

  const url = request.nextUrl.clone();
  url.pathname = redirectPath;
  url.search = '';

  if (!isAuthenticated && redirectPath === '/login') {
    url.searchParams.set('redirectTo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  return withNoStoreHeaders(NextResponse.redirect(url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
