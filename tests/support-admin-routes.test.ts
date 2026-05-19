import { describe, expect, it } from 'vitest';

import { readSystemDb } from '@/shared/mock/system-db';
import { uploadTicketAttachments } from '@/src/entities/support/model/chat-store';
import { createWithdrawal, resetMockWithdrawals } from '@/src/entities/withdrawal/model/mock-withdrawal-store';
import { POST as postMessageReaction } from '@/support-admin/app/v1/support/messages/[messageId]/reaction/route';
import { POST as addStaffPost } from '@/support-admin/app/v1/support/staff/route';
import { POST as postTicketMessage } from '@/support-admin/app/v1/support/tickets/[ticketId]/messages/route';
import { GET as getTicket } from '@/support-admin/app/v1/support/tickets/[ticketId]/route';
import { GET as getTicketStream } from '@/support-admin/app/v1/support/tickets/[ticketId]/stream/route';
import { GET as getSupportUsers } from '@/support-admin/app/v1/support/users/route';

describe('support-admin api routes', () => {
  it('rejects support users list request without session', async () => {
    const response = await getSupportUsers(
      new Request('http://localhost/v1/support/users')
    );

    expect(response.status).toBe(401);
  });

  it('rejects ticket details request without session', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 49,
      destination: 'wallet-auth',
      idempotencyKey: 'auth-k-1'
    });
    const ticketId = readSystemDb((db) => db.tickets.find((item) => item.withdrawal_id === created.id)?.id);
    expect(ticketId).toBeDefined();

    const response = await getTicket(
      new Request(`http://localhost/v1/support/tickets/${ticketId}`),
      { params: Promise.resolve({ ticketId: ticketId as string }) }
    );

    expect(response.status).toBe(401);
  });

  it('rejects ticket stream request without session', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 59,
      destination: 'wallet-stream-auth',
      idempotencyKey: 'stream-auth-k-1'
    });
    const ticketId = readSystemDb((db) => db.tickets.find((item) => item.withdrawal_id === created.id)?.id);
    expect(ticketId).toBeDefined();

    const response = await getTicketStream(
      new Request(`http://localhost/v1/support/tickets/${ticketId}/stream`),
      { params: Promise.resolve({ ticketId: ticketId as string }) }
    );

    expect(response.status).toBe(401);
  });

  it('allows admin to add support staff member', async () => {
    const response = await addStaffPost(
      new Request('http://localhost/v1/support/staff', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'support_admin_user=admin; support_admin_role=admin'
        },
        body: JSON.stringify({ username: 'support_agent_2' })
      })
    );

    expect(response.status).toBe(201);
    const snapshot = readSystemDb((db) => db);
    expect(snapshot.staff.some((item) => item.username === 'support_agent_2')).toBe(true);
  });

  it('saves support message to ticket chat', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 99,
      destination: 'wallet-chat',
      idempotencyKey: 'chat-k-1'
    });
    const ticketId = readSystemDb((db) => db.tickets.find((item) => item.withdrawal_id === created.id)?.id);
    expect(ticketId).toBeDefined();

    const postResponse = await postTicketMessage(
      new Request(`http://localhost/v1/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'support_admin_user=support; support_admin_role=support'
        },
        body: JSON.stringify({ text: 'We are checking your request now.' })
      }),
      { params: Promise.resolve({ ticketId: ticketId as string }) }
    );

    expect(postResponse.status).toBe(201);

    const ticketResponse = await getTicket(
      new Request(`http://localhost/v1/support/tickets/${ticketId}`, {
        headers: {
          cookie: 'support_admin_user=support; support_admin_role=support'
        }
      }),
      { params: Promise.resolve({ ticketId: ticketId as string }) }
    );
    expect(ticketResponse.status).toBe(200);

    const payload = (await ticketResponse.json()) as { messages: Array<{ text: string }> };
    expect(payload.messages.some((message) => message.text.includes('checking your request'))).toBe(true);
  });

  it('uploads an attachment separately and links it to a support message', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 129,
      destination: 'wallet-attachment',
      idempotencyKey: 'attachment-k-1'
    });
    const ticketId = readSystemDb((db) => db.tickets.find((item) => item.withdrawal_id === created.id)?.id);
    expect(ticketId).toBeDefined();

    const attachments = uploadTicketAttachments(ticketId as string, [
      {
        name: 'receipt.png',
        contentType: 'image/png',
        size: 8,
        bytes: new TextEncoder().encode('fake-png')
      }
    ]);
    expect(attachments[0]).toMatchObject({
      name: 'receipt.png',
      content_type: 'image/png'
    });

    const postResponse = await postTicketMessage(
      new Request(`http://localhost/v1/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'support_admin_user=support; support_admin_role=support'
        },
        body: JSON.stringify({
          text: 'Attached receipt',
          attachment_ids: [attachments[0]?.id]
        })
      }),
      { params: Promise.resolve({ ticketId: ticketId as string }) }
    );
    expect(postResponse.status).toBe(201);

    const message = (await postResponse.json()) as {
      attachments: Array<{ name: string; url: string }>;
    };
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments[0]).toMatchObject({
      name: 'receipt.png',
      url: `/v1/support/attachments/${attachments[0]?.id}`
    });
  });

  it('stores only one reaction per support message and replaces the previous emoji', async () => {
    resetMockWithdrawals();
    const created = createWithdrawal({
      amount: 139,
      destination: 'wallet-reaction',
      idempotencyKey: 'reaction-k-1'
    });
    const ticketId = readSystemDb((db) => db.tickets.find((item) => item.withdrawal_id === created.id)?.id);
    expect(ticketId).toBeDefined();
    const messageResponse = await postTicketMessage(
      new Request(`http://localhost/v1/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'support_admin_user=support; support_admin_role=support'
        },
        body: JSON.stringify({ text: 'Please react' })
      }),
      { params: Promise.resolve({ ticketId: ticketId as string }) }
    );
    const message = (await messageResponse.json()) as { id: string };

    await postMessageReaction(
      new Request(`http://localhost/v1/support/messages/${message.id}/reaction`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'support_admin_user=support; support_admin_role=support'
        },
        body: JSON.stringify({ emoji: '👍' })
      }),
      { params: Promise.resolve({ messageId: message.id }) }
    );
    const reactionResponse = await postMessageReaction(
      new Request(`http://localhost/v1/support/messages/${message.id}/reaction`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'support_admin_user=support; support_admin_role=support'
        },
        body: JSON.stringify({ emoji: '🔥' })
      }),
      { params: Promise.resolve({ messageId: message.id }) }
    );

    expect(reactionResponse.status).toBe(200);
    const ticketResponse = await getTicket(
      new Request(`http://localhost/v1/support/tickets/${ticketId}`, {
        headers: {
          cookie: 'support_admin_user=support; support_admin_role=support'
        }
      }),
      { params: Promise.resolve({ ticketId: ticketId as string }) }
    );
    const payload = (await ticketResponse.json()) as {
      messages: Array<{ id: string; reaction?: { emoji: string } }>;
    };
    expect(payload.messages.find((item) => item.id === message.id)?.reaction).toMatchObject({
      emoji: '🔥'
    });
  });
});
