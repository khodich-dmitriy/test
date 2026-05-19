import { describe, expect, it } from 'vitest';

import { readSystemDb, withSystemDb } from '@/shared/mock/system-db';
import { hasSessionRequest } from '@/src/entities/session/model/auth';
import { getTicketByWithdrawalId } from '@/src/entities/support/model/chat-store';
import { createWithdrawal, resetMockWithdrawals } from '@/src/entities/withdrawal/model/mock-withdrawal-store';
import { POST as postTicketMessage } from '@/withdraw-app/app/v1/support/tickets/[ticketId]/messages/route';
import { GET as getWithdrawalTicket } from '@/withdraw-app/app/v1/support/withdrawals/[withdrawalId]/ticket/route';

const demoSessionCookie = 'mock_access_token=access_ok';
const refreshOnlySessionCookie = 'mock_refresh_token=refresh_ok';

describe('withdraw support api routes', () => {
  it('rejects refresh-only sessions for support routes', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 175,
      destination: 'wallet-owned',
      idempotencyKey: 'withdraw-support-k-1'
    });

    const response = await getWithdrawalTicket(
      new Request(`http://localhost/v1/support/withdrawals/${created.id}/ticket`, {
        headers: {
          cookie: refreshOnlySessionCookie
        }
      }),
      { params: Promise.resolve({ withdrawalId: created.id }) }
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: 'Unauthorized' });
  });

  it('returns ticket and messages for the authenticated user on their own withdrawal', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 175,
      destination: 'wallet-owned',
      idempotencyKey: 'withdraw-support-k-1'
    });
    const ticket = getTicketByWithdrawalId(created.id);

    expect(hasSessionRequest(new Request('http://localhost', { headers: { cookie: demoSessionCookie } }))).toBe(true);

    const response = await getWithdrawalTicket(
      new Request(`http://localhost/v1/support/withdrawals/${created.id}/ticket`, {
        headers: {
          cookie: demoSessionCookie
        }
      }),
      { params: Promise.resolve({ withdrawalId: created.id }) }
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      ticket: { id: string; withdrawal_id: string | null };
      messages: Array<{ ticket_id: string; text: string }>;
    };

    expect(payload.ticket.id).toBe(ticket.id);
    expect(payload.ticket.withdrawal_id).toBe(created.id);
    expect(payload.messages).toHaveLength(1);
    expect(payload.messages[0].ticket_id).toBe(ticket.id);
  });

  it('recreates a missing support ticket for an existing authenticated withdrawal', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 185,
      destination: 'wallet-missing-ticket',
      idempotencyKey: 'withdraw-support-missing-ticket'
    });

    readSystemDb((db) => db);
    const snapshotBefore = readSystemDb((db) => ({
      ticketId: db.tickets.find((item) => item.withdrawal_id === created.id)?.id
    }));
    expect(snapshotBefore.ticketId).toBeDefined();

    withSystemDb((db) => {
      db.tickets = db.tickets.filter((item) => item.withdrawal_id !== created.id);
      db.messages = db.messages.filter((item) => item.ticket_id !== snapshotBefore.ticketId);
    });

    const response = await getWithdrawalTicket(
      new Request(`http://localhost/v1/support/withdrawals/${created.id}/ticket`, {
        headers: {
          cookie: demoSessionCookie
        }
      }),
      { params: Promise.resolve({ withdrawalId: created.id }) }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ticket: { withdrawal_id: string | null };
      messages: Array<{ text: string }>;
    };
    expect(payload.ticket.withdrawal_id).toBe(created.id);
    expect(payload.messages[0].text).toContain('wallet-missing-ticket');
  });

  it('allows the authenticated user to send a message to their own ticket', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 260,
      destination: 'wallet-message',
      idempotencyKey: 'withdraw-support-k-2'
    });
    const ticket = getTicketByWithdrawalId(created.id);

    const response = await postTicketMessage(
      new Request(`http://localhost/v1/support/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: demoSessionCookie
        },
        body: JSON.stringify({ text: 'Please check my withdrawal status.' })
      }),
      { params: Promise.resolve({ ticketId: ticket.id }) }
    );

    expect(response.status).toBe(201);

    const payload = (await response.json()) as {
      ticket_id: string;
      sender_role: 'user' | 'support';
      sender_name: string;
      text: string;
    };

    expect(payload.ticket_id).toBe(ticket.id);
    expect(payload.sender_role).toBe('user');
    expect(payload.text).toBe('Please check my withdrawal status.');

    const messages = readSystemDb((db) => db.messages.filter((item) => item.ticket_id === ticket.id));
    expect(messages.some((message) => message.text === 'Please check my withdrawal status.')).toBe(true);
  });

  it('returns a stable invalid payload response for non-string message text', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 260,
      destination: 'wallet-message',
      idempotencyKey: 'withdraw-support-k-3'
    });
    const ticket = getTicketByWithdrawalId(created.id);

    const response = await postTicketMessage(
      new Request(`http://localhost/v1/support/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: demoSessionCookie
        },
        body: JSON.stringify({ text: 123 })
      }),
      { params: Promise.resolve({ ticketId: ticket.id }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'Invalid payload' });
  });
});
