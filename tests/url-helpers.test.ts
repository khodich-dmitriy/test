import { describe, expect, it } from 'vitest';

import {
  APP_TEST_ORIGIN,
  createAppUrl,
  createWithdrawFeedApiUrl,
  getWithdrawalByIdApiRoute
} from '@/src/shared/config/urls';

describe('url helpers', () => {
  it('builds absolute app urls from shared origin', () => {
    expect(createAppUrl(getWithdrawalByIdApiRoute('w_1'))).toBe(
      `${APP_TEST_ORIGIN}/v1/withdrawals/w_1`
    );
  });

  it('builds feed url with query params', () => {
    expect(createWithdrawFeedApiUrl(null, 2)).toBe(`${APP_TEST_ORIGIN}/v1/withdrawals/feed?limit=2`);
    expect(createWithdrawFeedApiUrl('w_2', 2)).toBe(
      `${APP_TEST_ORIGIN}/v1/withdrawals/feed?limit=2&cursor=w_2`
    );
  });
});
