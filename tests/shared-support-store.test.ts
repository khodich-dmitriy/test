import { describe, expect, it } from 'vitest';

import { readSystemDb } from '@/shared/mock/system-db';
import {
  appendUserMessage,
  ensureTicketOwnedByUser,
  getTicketByWithdrawalId,
  listMessagesByTicketId} from '@/src/entities/support/model/chat-store';
import { createWithdrawal, resetMockWithdrawals } from '@/src/entities/withdrawal/model/mock-withdrawal-store';

describe('shared support mock store', () => {
  it('creates related support ticket and first user message when withdrawal is created', () => {
    resetMockWithdrawals();

    const created = createWithdrawal({
      amount: 150,
      destination: 'wallet-main',
      idempotencyKey: 'shared-k-1'
    });

    const snapshot = readSystemDb((db) => db);
    const ticket = snapshot.tickets.find((item) => item.withdrawal_id === created.id);

    expect(ticket).toBeDefined();
    expect(ticket?.user_id).toBe('user_demo');

    const ticketMessages = listMessagesByTicketId(ticket?.id ?? '');
    expect(ticketMessages.length).toBe(1);
    expect(ticketMessages[0].sender_role).toBe('user');
  });

  it('resolves a support ticket by withdrawal id', () => {
    resetMockWithdrawals();

    const created = createWithdrawal({
      amount: 220,
      destination: 'wallet-resolve',
      idempotencyKey: 'shared-k-2'
    });

    const ticket = getTicketByWithdrawalId(created.id);

    expect(ticket.withdrawal_id).toBe(created.id);
    expect(ticket.user_id).toBe('user_demo');
  });

  it('checks ticket ownership by user id', () => {
    resetMockWithdrawals();

    const created = createWithdrawal({
      amount: 310,
      destination: 'wallet-owner',
      idempotencyKey: 'shared-k-3'
    });
    const ticket = getTicketByWithdrawalId(created.id);

    expect(() => ensureTicketOwnedByUser(ticket, 'someone_else')).toThrowError('Access denied');
    expect(ensureTicketOwnedByUser(ticket, 'user_demo').id).toBe(ticket.id);
  });

  it('appends a user message and updates the ticket timestamp', () => {
    resetMockWithdrawals();

    const created = createWithdrawal({
      amount: 415,
      destination: 'wallet-message',
      idempotencyKey: 'shared-k-4'
    });
    const before = readSystemDb((db) => db.tickets.find((item) => item.withdrawal_id === created.id));

    expect(before).toBeDefined();
    const beforeUpdatedAt = before?.updated_at ?? '';

    const message = appendUserMessage(before?.id ?? '', 'demo', 'Need help with this withdrawal');
    const after = readSystemDb((db) => db.tickets.find((item) => item.id === before?.id));
    const messages = listMessagesByTicketId(before?.id ?? '');

    expect(message.sender_role).toBe('user');
    expect(message.text).toBe('Need help with this withdrawal');
    expect(messages).toHaveLength(2);
    expect(messages[messages.length - 1]).toEqual(message);
    expect(after?.updated_at).toBeTruthy();
    expect(after?.updated_at).not.toBe(beforeUpdatedAt);
  });
});
