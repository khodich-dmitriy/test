import { NextRequest, NextResponse } from 'next/server';

import { parseSessionFromCookie } from './src/entities/session/model/auth';

function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/auth/login');
}

function isStaticAssetPath(pathname: string): boolean {
  return pathname.startsWith('/_next');
}

function withNoStoreHeaders(response: NextResponse): NextResponse {
  response.headers.set('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('pragma', 'no-cache');
  response.headers.set('expires', '0');
  return response;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return withNoStoreHeaders(NextResponse.next());
  }

  const session = parseSessionFromCookie(request.headers.get('cookie'));
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return withNoStoreHeaders(NextResponse.redirect(url));
  }

  if (pathname.startsWith('/staff') || pathname.startsWith('/v1/support/staff')) {
    if (session.role !== 'admin') {
      return withNoStoreHeaders(NextResponse.json({ message: 'Admin access required' }, { status: 403 }));
    }
  }

  return withNoStoreHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!favicon.ico).*)']
};
