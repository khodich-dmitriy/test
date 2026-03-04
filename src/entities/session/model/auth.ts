export const AUTH_ACCESS_COOKIE_NAME = 'mock_access_token';
export const AUTH_REFRESH_COOKIE_NAME = 'mock_refresh_token';
export const AUTH_ACCESS_COOKIE_VALUE = 'access_ok';
export const AUTH_REFRESH_COOKIE_VALUE = 'refresh_ok';

export const MOCK_AUTH_USERNAME = 'demo';
export const MOCK_AUTH_PASSWORD = 'demo123';

export function isValidMockCredentials(username: string, password: string): boolean {
  return username === MOCK_AUTH_USERNAME && password === MOCK_AUTH_PASSWORD;
}

function getCookieValue(cookieHeader: string, cookieName: string): string | null {
  const segments = cookieHeader.split(';').map((item) => item.trim());
  for (const segment of segments) {
    if (!segment) {
      continue;
    }

    const [name, ...rest] = segment.split('=');
    if (name === cookieName) {
      return rest.join('=') || '';
    }
  }

  return null;
}

export function hasValidAccessCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) {
    return false;
  }

  const value = getCookieValue(cookieHeader, AUTH_ACCESS_COOKIE_NAME);
  return value === AUTH_ACCESS_COOKIE_VALUE;
}

export function hasValidRefreshCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) {
    return false;
  }

  const value = getCookieValue(cookieHeader, AUTH_REFRESH_COOKIE_NAME);
  return value === AUTH_REFRESH_COOKIE_VALUE;
}

export function hasActiveSessionCookie(cookieHeader: string | null): boolean {
  return hasValidAccessCookie(cookieHeader) || hasValidRefreshCookie(cookieHeader);
}

export function isAuthenticatedRequest(request: Request): boolean {
  return hasValidAccessCookie(request.headers.get('cookie'));
}

export function hasSessionRequest(request: Request): boolean {
  return hasActiveSessionCookie(request.headers.get('cookie'));
}
