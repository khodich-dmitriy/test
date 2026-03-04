import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

import WithdrawDetailsPage from '@/app/(private)/withdraw/[id]/page';
import {
  createWithdrawal,
  resetMockWithdrawals
} from '@/src/entities/withdrawal/model/mock-withdrawal-store';

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
    const ui = WithdrawDetailsPage({ params: { id: created.id } });

    render(ui);

    expect(await screen.findByText(new RegExp(`id: ${created.id}`, 'i'))).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(/amount: 100.00 usdt/i)).toBeInTheDocument();
    expect(screen.getByText(/network: trc20/i)).toBeInTheDocument();
  });

  it('показывает not found для неизвестного id', async () => {
    const ui = WithdrawDetailsPage({ params: { id: 'w_missing' } });

    render(ui);

    expect(await screen.findByText(/withdrawal not found/i)).toBeInTheDocument();
  });
});
