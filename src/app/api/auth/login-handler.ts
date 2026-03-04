import { NextResponse } from 'next/server';

import {
  AUTH_ACCESS_COOKIE_NAME,
  AUTH_ACCESS_COOKIE_VALUE,
  AUTH_REFRESH_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_VALUE,
  isValidMockCredentials
} from '@/src/entities/session/model/auth';

interface LoginPayload {
  username?: string;
  password?: string;
}

export async function handleLogin(request: Request) {
  let payload: LoginPayload;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  const username = (payload.username || '').trim();
  const password = payload.password || '';

  if (!isValidMockCredentials(username, password)) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
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
  response.cookies.set({
    name: AUTH_REFRESH_COOKIE_NAME,
    value: AUTH_REFRESH_COOKIE_VALUE,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8
  });

  return response;
}
