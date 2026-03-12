import { describe, expect, it } from 'vitest';

import { DELETE as deleteWithdrawal } from '@/app/v1/withdrawals/[id]/route';
import { GET as getWithdrawalById } from '@/app/v1/withdrawals/[id]/route';
import { GET as feedGet } from '@/app/v1/withdrawals/feed/route';
import { AUTH_ACCESS_COOKIE_NAME, AUTH_ACCESS_COOKIE_VALUE } from '@/src/entities/session/model/auth';
import {
  createWithdrawal,
  resetMockWithdrawals
} from '@/src/entities/withdrawal/model/mock-withdrawal-store';
import {
  createAppUrl,
  createWithdrawFeedApiUrl,
  getWithdrawalByIdApiRoute
} from '@/src/shared/config/urls';

function authHeaders(): HeadersInit {
  return {
    cookie: `${AUTH_ACCESS_COOKIE_NAME}=${AUTH_ACCESS_COOKIE_VALUE}`
  };
}

describe('withdraw feed api', () => {
  it('returns newest withdrawals first and supports cursor pagination', async () => {
    resetMockWithdrawals();

    const first = createWithdrawal({ amount: 10, destination: 'wallet-1', idempotencyKey: 'k-1' });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = createWithdrawal({ amount: 20, destination: 'wallet-2', idempotencyKey: 'k-2' });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const third = createWithdrawal({ amount: 30, destination: 'wallet-3', idempotencyKey: 'k-3' });

    const firstPage = await feedGet(
      new Request(createWithdrawFeedApiUrl(null, 2), { headers: authHeaders() })
    );
    const firstPayload = await firstPage.json();

    expect(firstPage.status).toBe(200);
    expect(firstPayload.items.map((item: { id: string }) => item.id)).toEqual([third.id, second.id]);
    expect(firstPayload.hasMore).toBe(true);
    expect(firstPayload.nextCursor).toBe(second.id);

    const secondPage = await feedGet(
      new Request(createWithdrawFeedApiUrl(second.id, 2), {
        headers: authHeaders()
      })
    );
    const secondPayload = await secondPage.json();

    expect(secondPayload.items.map((item: { id: string }) => item.id)).toEqual([first.id]);
    expect(secondPayload.hasMore).toBe(false);
    expect(secondPayload.nextCursor).toBeNull();
  });

  it('deletes a withdrawal and it becomes unavailable by id', async () => {
    resetMockWithdrawals();

    const created = createWithdrawal({
      amount: 44,
      destination: 'wallet-delete',
      idempotencyKey: 'k-delete'
    });

    const deleteResponse = await deleteWithdrawal(
      new Request(createAppUrl(getWithdrawalByIdApiRoute(created.id)), {
        method: 'DELETE',
        headers: authHeaders()
      }),
      { params: Promise.resolve({ id: created.id }) }
    );

    expect(deleteResponse.status).toBe(204);

    const getResponse = await getWithdrawalById(
      new Request(createAppUrl(getWithdrawalByIdApiRoute(created.id)), { headers: authHeaders() }),
      { params: Promise.resolve({ id: created.id }) }
    );

    expect(getResponse.status).toBe(404);
  });
});
