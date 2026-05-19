import { NextRequest, NextResponse } from 'next/server';

import { parseSessionFromCookie } from './src/entities/session/model/auth';

function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/auth/login') || pathname.startsWith('/_next');
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = parseSessionFromCookie(request.headers.get('cookie'));
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/staff') || pathname.startsWith('/v1/support/staff')) {
    if (session.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!favicon.ico).*)']
};
