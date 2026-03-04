import { NextResponse } from 'next/server';

import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME
} from '@/src/entities/session/model/auth';

export async function handleLogout() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: AUTH_ACCESS_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0
  });
  response.cookies.set({
    name: AUTH_REFRESH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0
  });

  return response;
}
