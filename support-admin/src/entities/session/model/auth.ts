import { NextResponse } from 'next/server';

export type SessionRole = 'admin' | 'support';

export const SUPPORT_USER_COOKIE = 'support_admin_user';
export const SUPPORT_ROLE_COOKIE = 'support_admin_role';

export interface SupportSession {
  username: string;
  role: SessionRole;
}

function decodeCookieComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function findCookieValue(cookieHeader: string, cookieName: string): string | null {
  const segments = cookieHeader.split(';').map((value) => value.trim());

  for (const segment of segments) {
    if (!segment) {
      continue;
    }

    const separatorIndex = segment.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const name = segment.slice(0, separatorIndex);
    if (name !== cookieName) {
      continue;
    }

    const rawValue = segment.slice(separatorIndex + 1);
    const decodedValue = decodeCookieComponent(rawValue);
    return decodedValue ?? null;
  }

  return null;
}

export function parseSessionFromCookie(cookieHeader: string | null): SupportSession | null {
  if (!cookieHeader) {
    return null;
  }

  const username = findCookieValue(cookieHeader, SUPPORT_USER_COOKIE);
  const role = findCookieValue(cookieHeader, SUPPORT_ROLE_COOKIE);

  if (!username || (role !== 'admin' && role !== 'support')) {
    return null;
  }

  return {
    username,
    role
  };
}

export function getSessionFromRequest(request: Request): SupportSession | null {
  return parseSessionFromCookie(request.headers.get('cookie'));
}

export function isAdmin(request: Request): boolean {
  return getSessionFromRequest(request)?.role === 'admin';
}

export function applySession(response: NextResponse, session: SupportSession): NextResponse {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: false,
    path: '/'
  };

  response.cookies.set(SUPPORT_USER_COOKIE, session.username, cookieOptions);
  response.cookies.set(SUPPORT_ROLE_COOKIE, session.role, cookieOptions);
  return response;
}

export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SUPPORT_USER_COOKIE, '', { path: '/', maxAge: 0 });
  response.cookies.set(SUPPORT_ROLE_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
