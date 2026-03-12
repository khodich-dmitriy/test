import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WithdrawPage from '@/app/(private)/withdraw/page';
import { resetWithdrawStore } from '@/src/features/withdraw/create/model/withdraw-store';
import {
  getWithdrawFeedDeleteButtonTestId,
  getWithdrawFeedItemTestId,
  WithdrawFeedTestId,
  WithdrawFormTestId
} from '@/src/shared/config/test-ids';
import {
  AuthApiRoute,
  WithdrawalApiRoute
} from '@/src/shared/config/urls';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

function mockFetchSequence(
  ...handlers: Array<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>
) {
  const fetchMock = vi.fn();
  handlers.forEach((handler) => fetchMock.mockImplementationOnce(handler));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('страница вывода средств', () => {
  beforeEach(() => {
    resetWithdrawStore();
    sessionStorage.clear();
    pushMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('успешно отправляет форму и добавляет новую заявку наверх списка', async () => {
    const fetchMock = mockFetchSequence(
      async () =>
        new Response(JSON.stringify({ items: [], nextCursor: null, hasMore: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }),
      async () =>
        new Response(
          JSON.stringify({ id: 'w_1', amount: 100, destination: 'wallet-1', status: 'pending' }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          }
        )
    );

    render(<WithdrawPage />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId(WithdrawFormTestId.AMOUNT_INPUT), '100');
    await user.type(screen.getByTestId(WithdrawFormTestId.DESTINATION_INPUT), 'wallet-1');
    await user.click(screen.getByTestId(WithdrawFormTestId.CONFIRM_CHECKBOX));
    await user.click(screen.getByTestId(WithdrawFormTestId.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(screen.getByTestId(getWithdrawFeedItemTestId('w_1'))).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('показывает сетевую ошибку и повторяет запрос без потери данных', async () => {
    const fetchMock = mockFetchSequence(
      async () =>
        new Response(JSON.stringify({ items: [], nextCursor: null, hasMore: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }),
      async () => {
        throw new Error('Network down');
      },
      async () =>
        new Response(
          JSON.stringify({ id: 'w_2', amount: 55, destination: 'wallet-2', status: 'pending' }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          }
        )
    );

    render(<WithdrawPage />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId(WithdrawFormTestId.AMOUNT_INPUT), '55');
    await user.type(screen.getByTestId(WithdrawFormTestId.DESTINATION_INPUT), 'wallet-2');
    await user.click(screen.getByTestId(WithdrawFormTestId.CONFIRM_CHECKBOX));
    await user.click(screen.getByTestId(WithdrawFormTestId.SUBMIT_BUTTON));

    expect(await screen.findByTestId(WithdrawFormTestId.ERROR_BANNER)).toBeInTheDocument();
    expect(screen.getByTestId(WithdrawFormTestId.AMOUNT_INPUT)).toHaveValue('55.00');
    expect(screen.getByTestId(WithdrawFormTestId.DESTINATION_INPUT)).toHaveValue('wallet-2');

    await user.click(screen.getByTestId(WithdrawFormTestId.ERROR_RETRY_BUTTON));

    await waitFor(() => {
      expect(screen.getByTestId(getWithdrawFeedItemTestId('w_2'))).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const postCalls = fetchMock.mock.calls.filter(
      ([url]) =>
        String(url).endsWith(WithdrawalApiRoute.LIST) &&
        !String(url).match(/\/v1\/withdrawals\/w_/)
    );
    const firstBody = JSON.parse(String(postCalls[0][1]?.body));
    const secondBody = JSON.parse(String(postCalls[1][1]?.body));
    expect(secondBody.idempotency_key).toBe(firstBody.idempotency_key);
  });

  it('защищает от двойного сабмита во время загрузки', async () => {
    let resolveFirst: ((response: Response) => void) | null = null;

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/withdrawals/feed')) {
        return Promise.resolve(
          new Response(JSON.stringify({ items: [], nextCursor: null, hasMore: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }
      if (url.endsWith(WithdrawalApiRoute.LIST)) {
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(new Response('{}', { status: 404 }));
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<WithdrawPage />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId(WithdrawFormTestId.AMOUNT_INPUT), '10');
    await user.type(screen.getByTestId(WithdrawFormTestId.DESTINATION_INPUT), 'wallet-3');
    await user.click(screen.getByTestId(WithdrawFormTestId.CONFIRM_CHECKBOX));

    const submitButton = screen.getByTestId(WithdrawFormTestId.SUBMIT_BUTTON);
    await user.click(submitButton);
    await user.click(submitButton);

    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith(WithdrawalApiRoute.LIST)
      );
      expect(postCalls).toHaveLength(1);
    });

    resolveFirst?.(
      new Response(
        JSON.stringify({ id: 'w_3', amount: 10, destination: 'wallet-3', status: 'pending' }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );

    await waitFor(() => {
      expect(screen.getByTestId(getWithdrawFeedItemTestId('w_3'))).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('показывает понятный текст конфликта для 409 ответа', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ items: [], nextCursor: null, hasMore: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'Duplicate idempotency key' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          })
        )
    );

    render(<WithdrawPage />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId(WithdrawFormTestId.AMOUNT_INPUT), '12');
    await user.type(screen.getByTestId(WithdrawFormTestId.DESTINATION_INPUT), 'wallet-409');
    await user.click(screen.getByTestId(WithdrawFormTestId.CONFIRM_CHECKBOX));
    await user.click(screen.getByTestId(WithdrawFormTestId.SUBMIT_BUTTON));

    expect(await screen.findByTestId(WithdrawFormTestId.ERROR_BANNER)).toHaveTextContent(
      /конфликт запроса/i
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('обновляет токен через refresh и повторяет отправку без потери данных', async () => {
    const fetchMock = mockFetchSequence(
      async () =>
        new Response(JSON.stringify({ items: [], nextCursor: null, hasMore: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }),
      async () =>
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }),
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }),
      async () =>
        new Response(
          JSON.stringify({
            id: 'w_refresh',
            amount: 77,
            destination: 'wallet-refresh',
            status: 'pending'
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          }
        )
    );

    render(<WithdrawPage />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId(WithdrawFormTestId.AMOUNT_INPUT), '77');
    await user.type(screen.getByTestId(WithdrawFormTestId.DESTINATION_INPUT), 'wallet-refresh');
    await user.click(screen.getByTestId(WithdrawFormTestId.CONFIRM_CHECKBOX));
    await user.click(screen.getByTestId(WithdrawFormTestId.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(screen.getByTestId(getWithdrawFeedItemTestId('w_refresh'))).toBeInTheDocument();
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[2][0])).toContain(AuthApiRoute.REFRESH);
  });

  it('не показывает кнопку открытия последней заявки если feed пустой', async () => {
    const now = Date.now();
    sessionStorage.setItem(
      'withdraw:last-success:v1',
      JSON.stringify({
        timestamp: now,
        withdrawal: {
          id: 'w_restore',
          amount: 33,
          destination: 'wallet-restore',
          status: 'pending',
          created_at: new Date(now).toISOString()
        }
      })
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [], nextCursor: null, hasMore: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );

    render(<WithdrawPage />);

    await waitFor(() => {
      expect(screen.queryByTestId(WithdrawFeedTestId.REGION)).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId(WithdrawFormTestId.SUCCESS_LINK)).not.toBeInTheDocument();
  });

  it('показывает skeleton во время первичной загрузки списка', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>(() => {
            // Intentionally unresolved: verifies loading state before the request settles.
          })
      )
    );

    render(<WithdrawPage />);

    expect(screen.getByTestId(WithdrawFeedTestId.INITIAL_SKELETON)).toBeInTheDocument();
    expect(screen.queryByTestId(WithdrawFeedTestId.REGION)).not.toBeInTheDocument();
  });

  it('удаляет заявку из списка после подтверждения', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              items: [
                {
                  id: 'w_delete',
                  amount: 50,
                  destination: 'wallet-delete',
                  status: 'pending',
                  created_at: '2026-03-12T10:00:00.000Z'
                }
              ],
              nextCursor: null,
              hasMore: false
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
    );

    render(<WithdrawPage />);
    const user = userEvent.setup();

    expect(await screen.findByTestId(getWithdrawFeedItemTestId('w_delete'))).toBeInTheDocument();
    await user.click(screen.getByTestId(getWithdrawFeedDeleteButtonTestId('w_delete')));
    expect(screen.getByTestId(WithdrawFeedTestId.DIALOG)).toBeInTheDocument();
    await user.click(screen.getByTestId(WithdrawFeedTestId.DIALOG_DELETE));

    await waitFor(() => {
      expect(screen.queryByTestId(getWithdrawFeedItemTestId('w_delete'))).not.toBeInTheDocument();
    });
  });

  it('закрывает модалку удаления без запроса если пользователь отменил действие', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'w_cancel',
              amount: 25,
              destination: 'wallet-cancel',
              status: 'pending',
              created_at: '2026-03-12T10:00:00.000Z'
            }
          ],
          nextCursor: null,
          hasMore: false
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<WithdrawPage />);
    const user = userEvent.setup();

    expect(await screen.findByTestId(getWithdrawFeedItemTestId('w_cancel'))).toBeInTheDocument();
    await user.click(screen.getByTestId(getWithdrawFeedDeleteButtonTestId('w_cancel')));
    const dialog = screen.getByTestId(WithdrawFeedTestId.DIALOG);
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByTestId(WithdrawFeedTestId.DIALOG_CANCEL));

    await waitFor(() => {
      expect(screen.queryByTestId(WithdrawFeedTestId.DIALOG)).not.toBeInTheDocument();
    });
    expect(screen.getByTestId(getWithdrawFeedItemTestId('w_cancel'))).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('подгружает следующую страницу списка при скролле вниз', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: 'w_3',
                amount: 30,
                destination: 'wallet-3',
                status: 'pending',
                created_at: '2026-03-12T10:03:00.000Z'
              },
              {
                id: 'w_2',
                amount: 20,
                destination: 'wallet-2',
                status: 'pending',
                created_at: '2026-03-12T10:02:00.000Z'
              }
            ],
            nextCursor: 'w_2',
            hasMore: true
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              {
                id: 'w_1',
                amount: 10,
                destination: 'wallet-1',
                status: 'pending',
                created_at: '2026-03-12T10:01:00.000Z'
              }
            ],
            nextCursor: null,
            hasMore: false
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<WithdrawPage />);

    const list = await screen.findByTestId(WithdrawFeedTestId.REGION);
    Object.defineProperty(list, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(list, 'scrollHeight', { value: 900, configurable: true });
    Object.defineProperty(list, 'scrollTop', { value: 550, configurable: true });
    await act(async () => {
      list.dispatchEvent(new Event('scroll'));
    });

    expect(screen.getByTestId(WithdrawFeedTestId.LOAD_MORE_SKELETON)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId(getWithdrawFeedItemTestId('w_1'))).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
