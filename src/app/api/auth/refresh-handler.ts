import { NextResponse } from 'next/server';

import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_ACCESS_COOKIE_VALUE,
  hasValidRefreshCookie
} from '@/src/entities/session/model/auth';

export async function handleRefresh(request: Request) {
  if (!hasValidRefreshCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ message: 'Refresh token expired' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: AUTH_ACCESS_COOKIE_NAME,
    value: AUTH_ACCESS_COOKIE_VALUE,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60
  });

  return response;
}
