import { describe, expect, it } from 'vitest';

import { parseSessionFromCookie } from '@/support-admin/src/entities/session/model/auth';

describe('support-admin session cookie parsing', () => {
  it('returns null for malformed encoded cookie instead of throwing', () => {
    const malformedCookie =
      'support_admin_user=%E0%A4%A; support_admin_role=admin';

    expect(() => parseSessionFromCookie(malformedCookie)).not.toThrow();
    expect(parseSessionFromCookie(malformedCookie)).toBeNull();
  });

  it('parses valid encoded username and role', () => {
    const cookieHeader = 'support_admin_user=support%20agent; support_admin_role=support';

    expect(parseSessionFromCookie(cookieHeader)).toEqual({
      username: 'support agent',
      role: 'support'
    });
  });
});
