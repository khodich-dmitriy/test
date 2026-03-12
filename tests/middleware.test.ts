import { describe, expect, it } from 'vitest';

import { middleware } from '@/middleware';

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
});
