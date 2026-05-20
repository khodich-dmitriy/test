import { describe, expect, it } from 'vitest';

import { middleware } from '@/middleware';
import { AUTH_ACCESS_COOKIE_NAME, AUTH_ACCESS_COOKIE_VALUE } from '@/src/entities/session/model/auth';

function createRequest(path: string, cookieHeader: string | null = null) {
  const url = new URL(`http://localhost${path}`);

  return {
    headers: {
      get(name: string) {
        if (name.toLowerCase() === 'cookie') {
          return cookieHeader;
        }

        return null;
      }
    },
    nextUrl: {
      pathname: url.pathname,
      search: url.search,
      clone() {
        return new URL(url.toString());
      }
    }
  };
}

describe('middleware redirects', () => {
  it('redirects guest private requests to login with full redirectTo target', () => {
    const response = middleware(createRequest('/withdraw/w_1?tab=history') as never);

    expect(response.headers.get('location')).toBe(
      'http://localhost/login?redirectTo=%2Fwithdraw%2Fw_1%3Ftab%3Dhistory'
    );
  });

  it('marks navigational responses as no-store so rebuilt HTML cannot keep stale JS links', () => {
    const response = middleware(
      createRequest('/withdraw', `${AUTH_ACCESS_COOKIE_NAME}=${AUTH_ACCESS_COOKIE_VALUE}`) as never
    );

    expect(response.headers.get('cache-control')).toBe(
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('expires')).toBe('0');
  });

  it('marks redirects as no-store too', () => {
    const response = middleware(createRequest('/withdraw/w_1?tab=history') as never);

    expect(response.headers.get('cache-control')).toBe(
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
  });
});
