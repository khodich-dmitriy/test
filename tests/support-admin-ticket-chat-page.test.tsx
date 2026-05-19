import { act, render, screen, waitFor,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TicketChatPage } from '@/support-admin/src/views/ticket-chat/ui/ticket-chat-page';

let messageHandler: ((event: MessageEvent) => void) | null = null;
let eventSourceInstance: MockEventSource | null = null;
const closeMock = vi.fn();

class MockEventSource {
  onerror: ((this: EventSource, ev: Event) => unknown) | null = null;

  constructor(url: string) {
    void url;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    eventSourceInstance = this;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === 'message') {
      messageHandler = listener as (event: MessageEvent) => void;
    }
  }

  close() {
    closeMock();
  }

  emitError() {
    this.onerror?.(new Event('error'));
  }
}

describe('support-admin ticket chat page', () => {
  beforeEach(() => {
    messageHandler = null;
    eventSourceInstance = null;
    closeMock.mockReset();
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not duplicate the same SSE message by id', () => {
    render(
      <TicketChatPage
        ticketId="t_1"
        initialPayload={{
          ticket: {
            id: 't_1',
            user_id: 'u_1',
            withdrawal_id: null,
            subject: 'Need help',
            status: 'open',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z'
          },
          user: {
            id: 'u_1',
            username: 'demo',
            email: 'demo@example.test',
            created_at: '2026-04-19T00:00:00.000Z'
          },
          messages: []
        }}
      />
    );

    const duplicateMessage = {
      id: 'm_1',
      ticket_id: 't_1',
      sender_role: 'support' as const,
      sender_name: 'support',
      text: 'Hello from support',
      created_at: '2026-04-19T00:00:01.000Z'
    };

    act(() => {
      messageHandler?.(
        new MessageEvent('message', {
          data: JSON.stringify(duplicateMessage)
        })
      );
      messageHandler?.(
        new MessageEvent('message', {
          data: JSON.stringify(duplicateMessage)
        })
      );
    });

    expect(screen.getAllByText(/Hello from support/i)).toHaveLength(1);
  });

  it('keeps reconnecting when the stream errors', () => {
    render(
      <TicketChatPage
        ticketId="t_1"
        initialPayload={{
          ticket: {
            id: 't_1',
            user_id: 'u_1',
            withdrawal_id: null,
            subject: 'Need help',
            status: 'open',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z'
          },
          user: {
            id: 'u_1',
            username: 'demo',
            email: 'demo@example.test',
            created_at: '2026-04-19T00:00:00.000Z'
          },
          messages: []
        }}
      />
    );

    act(() => {
      eventSourceInstance?.emitError();
    });

    expect(closeMock).not.toHaveBeenCalled();
  });

  it('adds the sent support message locally without a slow full refresh', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'm_1',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'Thanks for the update',
            created_at: '2026-04-19T00:00:01.000Z'
          }),
          { status: 201, headers: { 'content-type': 'application/json' } }
        )
      )

    const user = userEvent.setup();

    render(
      <TicketChatPage
        ticketId="t_1"
        initialPayload={{
          ticket: {
            id: 't_1',
            user_id: 'u_1',
            withdrawal_id: null,
            subject: 'Need help',
            status: 'open',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z'
          },
          user: {
            id: 'u_1',
            username: 'demo',
            email: 'demo@example.test',
            created_at: '2026-04-19T00:00:00.000Z'
          },
          messages: []
        }}
      />
    );

    await user.type(screen.getByPlaceholderText('Type support reply...'), 'Thanks for the update');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Thanks for the update')).toBeInTheDocument();
  });

  it('disables whitespace-only submissions before sending', async () => {
    const fetchMock = vi.mocked(fetch);
    const user = userEvent.setup();

    render(
      <TicketChatPage
        ticketId="t_1"
        initialPayload={{
          ticket: {
            id: 't_1',
            user_id: 'u_1',
            withdrawal_id: null,
            subject: 'Need help',
            status: 'open',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z'
          },
          user: {
            id: 'u_1',
            username: 'demo',
            email: 'demo@example.test',
            created_at: '2026-04-19T00:00:00.000Z'
          },
          messages: []
        }}
      />
    );

    const input = screen.getByPlaceholderText('Type support reply...');
    const sendButton = screen.getByRole('button', { name: 'Send' });

    expect(sendButton).toBeDisabled();

    await user.type(input, '   ');

    expect(sendButton).toBeDisabled();
    await user.click(sendButton);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders chat messages in one telegram-style timeline with role markers', () => {
    const { container } = render(
      <TicketChatPage
        ticketId="t_1"
        initialPayload={{
          ticket: {
            id: 't_1',
            user_id: 'u_1',
            withdrawal_id: null,
            subject: 'Need help',
            status: 'open',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z'
          },
          user: {
            id: 'u_1',
            username: 'demo',
            email: 'demo@example.test',
            created_at: '2026-04-19T00:00:00.000Z'
          },
          messages: [
            {
              id: 'm_user',
              ticket_id: 't_1',
              sender_role: 'user',
              sender_name: 'demo',
              text: 'I need help with this ticket',
              created_at: '2026-04-19T00:00:01.000Z'
            },
            {
              id: 'm_support',
              ticket_id: 't_1',
              sender_role: 'support',
              sender_name: 'support',
              text: 'We are checking it now',
              created_at: '2026-04-19T00:00:02.000Z'
            }
          ]
        }}
      />
    );

    const log = screen.getByRole('log', { name: 'Ticket messages' });

    expect(
      within(log).getByText('I need help with this ticket').closest('[data-role]')
    ).toHaveAttribute('data-role', 'user');
    expect(
      within(log).getByText('We are checking it now').closest('[data-role]')
    ).toHaveAttribute('data-role', 'support');
    expect(container.querySelectorAll('[data-role="user"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-role="support"]')).toHaveLength(1);
  });

  it('filters support chat messages by search text', async () => {
    const user = userEvent.setup();

    render(
      <TicketChatPage
        ticketId="t_1"
        initialPayload={{
          ticket: {
            id: 't_1',
            user_id: 'u_1',
            withdrawal_id: null,
            subject: 'Need help',
            status: 'open',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z'
          },
          user: {
            id: 'u_1',
            username: 'demo',
            email: 'demo@example.test',
            created_at: '2026-04-19T00:00:00.000Z'
          },
          messages: [
            {
              id: 'm_user',
              ticket_id: 't_1',
              sender_role: 'user',
              sender_name: 'demo',
              text: 'Card withdrawal is stuck',
              created_at: '2026-04-19T00:00:01.000Z'
            },
            {
              id: 'm_support',
              ticket_id: 't_1',
              sender_role: 'support',
              sender_name: 'support',
              text: 'Bank transfer is being checked',
              created_at: '2026-04-19T00:00:02.000Z'
            }
          ]
        }}
      />
    );

    await user.type(screen.getByPlaceholderText('Search messages'), 'bank');

    expect(screen.queryByText('Card withdrawal is stuck')).not.toBeInTheDocument();
    expect(screen.getByText('Bank transfer is being checked')).toBeInTheDocument();
  });

  it('selects one reaction from a telegram-style reaction picker', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ reaction: { emoji: '🔥' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    }));

    render(
      <TicketChatPage
        ticketId="t_1"
        initialPayload={{
          ticket: {
            id: 't_1',
            user_id: 'u_1',
            withdrawal_id: null,
            subject: 'Need help',
            status: 'open',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z'
          },
          user: {
            id: 'u_1',
            username: 'demo',
            email: 'demo@example.test',
            created_at: '2026-04-19T00:00:00.000Z'
          },
          messages: [
            {
              id: 'm_user',
              ticket_id: 't_1',
              sender_role: 'user',
              sender_name: 'demo',
              text: 'Please check this',
              created_at: '2026-04-19T00:00:01.000Z'
            }
          ]
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Choose reaction' }));
    expect(screen.getByRole('button', { name: 'React with thumbs up' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'React with fire' }));

    expect(fetchMock).toHaveBeenCalledWith('/v1/support/messages/m_user/reaction', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emoji: '🔥' })
    });
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.queryByText('👍')).not.toBeInTheDocument();
  });

  it('uploads selected attachments before sending a support message', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            attachments: [
              {
                id: 'att_1',
                ticket_id: 't_1',
                name: 'proof.png',
                content_type: 'image/png',
                size: 8,
                url: '/v1/support/attachments/att_1'
              }
            ]
          }),
          { status: 201, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'm_sent',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'See proof',
            created_at: '2026-04-19T00:00:02.000Z',
            attachments: [
              {
                id: 'att_1',
                ticket_id: 't_1',
                name: 'proof.png',
                content_type: 'image/png',
                size: 8,
                url: '/v1/support/attachments/att_1'
              }
            ]
          }),
          { status: 201, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ticket: {
              id: 't_1',
              user_id: 'u_1',
              withdrawal_id: null,
              subject: 'Need help',
              status: 'open',
              created_at: '2026-04-19T00:00:00.000Z',
              updated_at: '2026-04-19T00:00:02.000Z'
            },
            user: {
              id: 'u_1',
              username: 'demo',
              email: 'demo@example.test',
              created_at: '2026-04-19T00:00:00.000Z'
            },
            messages: []
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );

    render(
      <TicketChatPage
        ticketId="t_1"
        initialPayload={{
          ticket: {
            id: 't_1',
            user_id: 'u_1',
            withdrawal_id: null,
            subject: 'Need help',
            status: 'open',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z'
          },
          user: {
            id: 'u_1',
            username: 'demo',
            email: 'demo@example.test',
            created_at: '2026-04-19T00:00:00.000Z'
          },
          messages: []
        }}
      />
    );

    await user.type(screen.getByPlaceholderText('Type support reply...'), 'See proof');
    await user.upload(screen.getByLabelText('Attach files'), new File(['fake-png'], 'proof.png', { type: 'image/png' }));
    expect(screen.getByText('proof.png')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/v1/support/tickets/t_1/attachments',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/v1/support/tickets/t_1/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'See proof', attachment_ids: ['att_1'] })
      })
    );
  });

  it('shows a notification when a user message arrives for support', () => {
    render(
      <TicketChatPage
        ticketId="t_1"
        initialPayload={{
          ticket: {
            id: 't_1',
            user_id: 'u_1',
            withdrawal_id: null,
            subject: 'Need help',
            status: 'open',
            created_at: '2026-04-19T00:00:00.000Z',
            updated_at: '2026-04-19T00:00:00.000Z'
          },
          user: {
            id: 'u_1',
            username: 'demo',
            email: 'demo@example.test',
            created_at: '2026-04-19T00:00:00.000Z'
          },
          messages: []
        }}
      />
    );

    act(() => {
      messageHandler?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            id: 'm_user',
            ticket_id: 't_1',
            sender_role: 'user',
            sender_name: 'demo',
            text: 'New user message',
            created_at: '2026-04-19T00:00:01.000Z'
          })
        })
      );
    });

    expect(screen.getByRole('status')).toHaveTextContent('New message from demo');
  });
});
