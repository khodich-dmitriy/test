import { describe, expect, it } from 'vitest';

import { middleware } from '../support-admin/middleware';
import { SUPPORT_ROLE_COOKIE, SUPPORT_USER_COOKIE } from '../support-admin/src/entities/session/model/auth';

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

describe('support admin middleware cache headers', () => {
  it('marks admin navigational responses as no-store so rebuilt HTML cannot keep stale JS links', () => {
    const response = middleware(
      createRequest(
        '/tickets/t_1',
        `${SUPPORT_USER_COOKIE}=agent; ${SUPPORT_ROLE_COOKIE}=support`
      ) as never
    );

    expect(response.headers.get('cache-control')).toBe(
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('expires')).toBe('0');
  });
});
