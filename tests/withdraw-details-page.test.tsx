import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

import WithdrawDetailsPage from '@/app/(private)/withdraw/[id]/page';
import {
  createWithdrawal,
  resetMockWithdrawals
} from '@/src/entities/withdrawal/model/mock-withdrawal-store';
import { WithdrawDetailsTestId } from '@/src/shared/config/test-ids';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

describe('страница деталей заявки', () => {
  beforeEach(() => {
    resetMockWithdrawals();
  });

  it('рендерит заявку загруженную на сервере по id', async () => {
    const created = createWithdrawal({
      amount: 100,
      destination: 'wallet-10',
      idempotencyKey: 'k-10'
    });
    const page = await WithdrawDetailsPage({ params: Promise.resolve({ id: created.id }) });
    render(page);

    expect(await screen.findByTestId(WithdrawDetailsTestId.ID)).toHaveTextContent(created.id);
    expect(screen.getByTestId(WithdrawDetailsTestId.STATUS)).toHaveTextContent('В ожидании');
    expect(screen.getByTestId(WithdrawDetailsTestId.AMOUNT)).toHaveTextContent('100,00 USDT');
    expect(screen.getByTestId(WithdrawDetailsTestId.NETWORK)).toHaveTextContent('TRC20');
  });

  it('показывает not found для неизвестного id', async () => {
    const page = await WithdrawDetailsPage({ params: Promise.resolve({ id: 'w_missing' }) });
    render(page);

    expect(await screen.findByTestId(WithdrawDetailsTestId.NOT_FOUND)).toBeInTheDocument();
  });
});
