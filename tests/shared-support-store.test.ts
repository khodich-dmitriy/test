import { describe, expect, it } from 'vitest';

import { readSystemDb } from '@/shared/mock/system-db';
import {
  appendUserMessage,
  assignTicketToAvailableSupport,
  ensureTicketOwnedByUser,
  getTicketByWithdrawalId,
  listChatEventsByTicketId,
  listMessagesByTicketId,
  markInactiveSupportTickets,
  setMessageReaction,
  uploadTicketAttachments} from '@/src/entities/support/model/chat-store';
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

  it('stores reply metadata, media transcript metadata, and chat events', () => {
    resetMockWithdrawals();

    const created = createWithdrawal({
      amount: 520,
      destination: 'wallet-media',
      idempotencyKey: 'shared-k-5'
    });
    const ticket = getTicketByWithdrawalId(created.id);
    const firstMessage = listMessagesByTicketId(ticket.id)[0];
    const attachments = uploadTicketAttachments(ticket.id, [
      {
        name: 'voice.webm',
        contentType: 'audio/webm',
        transcript: 'Recognized speech from browser',
        size: 12,
        bytes: new TextEncoder().encode('fake-audio')
      }
    ]);

    const reply = appendUserMessage(ticket.id, 'demo', 'Reply with voice', [attachments[0].id], firstMessage.id);
    const messages = listMessagesByTicketId(ticket.id);
    const events = listChatEventsByTicketId(ticket.id);

    expect(reply.reply_to_message_id).toBe(firstMessage.id);
    expect(messages.find((message) => message.id === reply.id)?.reply_to).toMatchObject({
      id: firstMessage.id
    });
    expect(reply.attachments?.[0]).toMatchObject({
      media_type: 'audio',
      transcript: 'Recognized speech from browser'
    });
    expect(events.some((event) => event.type === 'message' && event.message?.id === reply.id)).toBe(true);
  });

  it('emits reaction events when the single message reaction changes', () => {
    resetMockWithdrawals();

    const created = createWithdrawal({
      amount: 610,
      destination: 'wallet-event',
      idempotencyKey: 'shared-k-6'
    });
    const ticket = getTicketByWithdrawalId(created.id);
    const message = appendUserMessage(ticket.id, 'demo', 'React to this');

    setMessageReaction(message.id, 'support', 'support', '👍');
    const reaction = setMessageReaction(message.id, 'support', 'support', '🔥');
    const events = listChatEventsByTicketId(ticket.id);

    expect(reaction.emoji).toBe('🔥');
    expect(events.filter((event) => event.type === 'reaction')).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({
      type: 'reaction',
      reaction: expect.objectContaining({ emoji: '🔥' })
    });
  });

  it('assigns no more than three active tickets to one support member and marks stale tickets inactive', () => {
    resetMockWithdrawals();

    const tickets = Array.from({ length: 4 }, (_, index) => {
      const created = createWithdrawal({
        amount: 700 + index,
        destination: `wallet-assign-${index}`,
        idempotencyKey: `shared-k-assign-${index}`
      });
      return getTicketByWithdrawalId(created.id);
    });

    const assigned = tickets.map((ticket) => assignTicketToAvailableSupport(ticket.id));

    expect(assigned.filter((ticket) => ticket.assigned_staff_username === 'support')).toHaveLength(3);
    expect(assigned[3].assigned_staff_username).toBe('admin');

    const stale = markInactiveSupportTickets(new Date(Date.now() + 11 * 60 * 1000).toISOString());
    expect(stale.length).toBeGreaterThanOrEqual(4);
    expect(stale.every((ticket) => ticket.support_state === 'inactive')).toBe(true);
  });
});
