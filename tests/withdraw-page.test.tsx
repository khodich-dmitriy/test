import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WithdrawPage from '@/app/(private)/withdraw/page';
import { resetWithdrawStore } from '@/src/features/withdraw/create/model/withdraw-store';
import { WithdrawFormTestId } from '@/src/shared/config/test-ids';
import {
  AuthApiRoute,
  getWithdrawDetailsRoute,
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

  it('успешно отправляет форму и делает переход на страницу заявки', async () => {
    const fetchMock = mockFetchSequence(
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
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(getWithdrawDetailsRoute('w_1'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('показывает сетевую ошибку и повторяет запрос без потери данных', async () => {
    const fetchMock = mockFetchSequence(
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
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('55.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('wallet-2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(getWithdrawDetailsRoute('w_2'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const postCalls = fetchMock.mock.calls.filter(
      ([url]) =>
        String(url).includes(WithdrawalApiRoute.LIST) &&
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

    const submitButton = screen.getByRole('button', { name: /submit/i });
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
      expect(pushMock).toHaveBeenCalledWith(getWithdrawDetailsRoute('w_3'));
    });
  });

  it('показывает понятный текст конфликта для 409 ответа', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
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
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/request conflict/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('обновляет токен через refresh и повторяет отправку без потери данных', async () => {
    const fetchMock = mockFetchSequence(
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
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(getWithdrawDetailsRoute('w_refresh'));
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain(AuthApiRoute.REFRESH);
  });

  it('восстанавливает последнюю успешную заявку и открывает страницу деталей', async () => {
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

    render(<WithdrawPage />);
    const user = userEvent.setup();

    expect(
      await screen.findByRole('button', { name: /open last withdrawal/i })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open last withdrawal/i }));

    expect(pushMock).toHaveBeenCalledWith(getWithdrawDetailsRoute('w_restore'));
  });
});
