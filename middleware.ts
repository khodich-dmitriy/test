import { NextRequest, NextResponse } from 'next/server';

import { resolveAuthRedirect } from '@/src/entities/session/lib/auth-redirect';
import { hasActiveSessionCookie } from '@/src/entities/session/model/auth';

export function middleware(request: NextRequest) {
  const isAuthenticated = hasActiveSessionCookie(request.headers.get('cookie'));
  const redirectPath = resolveAuthRedirect(request.nextUrl.pathname, isAuthenticated);

  if (!redirectPath) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = redirectPath;
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
