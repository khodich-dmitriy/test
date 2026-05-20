import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WithdrawTicketChat } from '@/src/features/support/chat/ui/withdraw-ticket-chat';

type TicketPayload = {
  ticket: {
    id: string;
    withdrawal_id: string | null;
    subject: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
  };
  messages: Array<{
    id: string;
    ticket_id: string;
    sender_role: 'user' | 'support';
    sender_name: string;
    text: string;
    created_at: string;
  }>;
};

let messageHandler: ((event: MessageEvent) => void) | null = null;
let openHandler: (() => void) | null = null;
let errorHandler: (() => void) | null = null;
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
    if (type === 'open') {
      openHandler = listener as () => void;
      return;
    }

    if (type === 'message') {
      messageHandler = listener as (event: MessageEvent) => void;
      return;
    }

    if (type === 'error') {
      errorHandler = listener as () => void;
    }
  }

  close() {
    closeMock();
  }

  emitOpen() {
    openHandler?.();
  }

  emitError() {
    errorHandler?.();
    this.onerror?.(new Event('error'));
  }
}

function createTicketPayload(messages: TicketPayload['messages']): TicketPayload {
  return {
    ticket: {
      id: 't_1',
      withdrawal_id: 'w_1',
      subject: 'Withdrawal support',
      status: 'open',
      created_at: '2026-04-19T00:00:00.000Z',
      updated_at: '2026-04-19T00:00:00.000Z'
    },
    messages
  };
}

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  });
}

describe('withdraw ticket chat', () => {
  beforeEach(() => {
    messageHandler = null;
    openHandler = null;
    errorHandler = null;
    eventSourceInstance = null;
    closeMock.mockReset();
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads ticket messages for a withdrawal from the support endpoint', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(
        createTicketPayload([
          {
            id: 'm_1',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'We are checking this now',
            created_at: '2026-04-19T00:00:01.000Z'
          }
        ])
      )
    );

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(
      await screen.findByText('We are checking this now')
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/v1/support/withdrawals/w_1/ticket', {
      cache: 'no-store'
    });
  });

  it('deduplicates repeated SSE messages by id', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(mockJsonResponse(createTicketPayload([])));

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    await screen.findByText('No messages yet.');

    const duplicateMessage = {
      id: 'm_2',
      ticket_id: 't_1',
      sender_role: 'support' as const,
      sender_name: 'support',
      text: 'Repeated message',
      created_at: '2026-04-19T00:00:02.000Z'
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

    expect(screen.getAllByText('Repeated message')).toHaveLength(1);
  });

  it('preserves payload when a later reload fails after the stream connects', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse(
          createTicketPayload([
            {
              id: 'm_4',
              ticket_id: 't_1',
              sender_role: 'support',
              sender_name: 'support',
              text: 'Initial payload',
              created_at: '2026-04-19T00:00:01.000Z'
            }
          ])
        )
      )
      .mockRejectedValueOnce(new Error('Reload failed'));

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByText('Initial payload')).toBeInTheDocument();
    await waitFor(() => expect(openHandler).toBeTruthy());

    act(() => {
      eventSourceInstance?.emitOpen();
    });

    expect(await screen.findByText('Initial payload')).toBeInTheDocument();
    expect(await screen.findByTestId('withdraw-ticket-chat-error')).toHaveTextContent(
      'Reload failed'
    );
    expect(closeMock).not.toHaveBeenCalled();

    act(() => {
      eventSourceInstance?.emitError();
    });

    expect(closeMock).not.toHaveBeenCalled();
  });

  it('keeps the existing payload when a stale reconciliation response resolves later', async () => {
    const fetchMock = vi.mocked(fetch);
    let resolveReload: ((response: Response) => void) | null = null;

    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse(
          createTicketPayload([
            {
              id: 'm_6',
              ticket_id: 't_1',
              sender_role: 'support',
              sender_name: 'support',
              text: 'Initial payload',
              created_at: '2026-04-19T00:00:01.000Z'
            }
          ])
        )
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveReload = resolve;
          })
      );

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByText('Initial payload')).toBeInTheDocument();

    act(() => {
      eventSourceInstance?.emitOpen();
    });

    await act(async () => {
      resolveReload?.(
        mockJsonResponse(
          createTicketPayload([
            {
              id: 'm_6',
              ticket_id: 't_1',
              sender_role: 'support',
              sender_name: 'support',
              text: 'Initial payload',
              created_at: '2026-04-19T00:00:01.000Z'
            }
          ])
        )
      );
    });

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
    expect(screen.getByText('Initial payload')).toBeInTheDocument();
  });

  it('sends a user message through the ticket messages endpoint', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(createTicketPayload([])))
      .mockResolvedValueOnce(
        mockJsonResponse({
          id: 'm_3',
          ticket_id: 't_1',
          sender_role: 'user',
          sender_name: 'demo',
          text: 'Need help with this withdrawal',
          created_at: '2026-04-19T00:00:03.000Z'
        }, 201)
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          createTicketPayload([
            {
              id: 'm_3',
              ticket_id: 't_1',
              sender_role: 'user',
              sender_name: 'demo',
              text: 'Need help with this withdrawal',
              created_at: '2026-04-19T00:00:03.000Z'
            }
          ])
        )
      );

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    await screen.findByText('No messages yet.');

    const input = await screen.findByTestId('withdraw-ticket-chat-input');
    const sendButton = screen.getByTestId('withdraw-ticket-chat-send-button');
    const user = userEvent.setup();

    await user.type(input, 'Need help with this withdrawal');
    await user.click(sendButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/v1/support/tickets/t_1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ text: 'Need help with this withdrawal' })
      });
    });

    expect(await screen.findByText('Need help with this withdrawal')).toBeInTheDocument();
  });

  it('filters user chat messages by search text', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(
        createTicketPayload([
          {
            id: 'm_8',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'Bank transfer is being checked',
            created_at: '2026-04-19T00:00:01.000Z'
          },
          {
            id: 'm_9',
            ticket_id: 't_1',
            sender_role: 'user',
            sender_name: 'demo',
            text: 'Card withdrawal is stuck',
            created_at: '2026-04-19T00:00:02.000Z'
          }
        ])
      )
    );
    const user = userEvent.setup();

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    await screen.findByText('Bank transfer is being checked');
    await user.type(screen.getByPlaceholderText('Search messages'), 'card');

    expect(screen.queryByText('Bank transfer is being checked')).not.toBeInTheDocument();
    expect(screen.getByText('Card withdrawal is stuck')).toBeInTheDocument();
  });

  it('selects one reaction from a telegram-style reaction picker', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse(
          createTicketPayload([
            {
              id: 'm_10',
              ticket_id: 't_1',
              sender_role: 'support',
              sender_name: 'support',
              text: 'We found the issue',
              created_at: '2026-04-19T00:00:01.000Z'
            }
          ])
        )
      )
      .mockResolvedValueOnce(mockJsonResponse({ reaction: { emoji: '❤️' } }));
    const user = userEvent.setup();

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    await screen.findByText('We found the issue');
    await user.click(screen.getByRole('button', { name: 'Choose reaction' }));
    await user.click(screen.getByRole('button', { name: 'React with heart' }));

    expect(fetchMock).toHaveBeenCalledWith('/v1/support/messages/m_10/reaction', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ emoji: '❤️' })
    });
    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.queryByText('👍')).not.toBeInTheDocument();
  });

  it('renders media messages through the shared telegram-style timeline', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(
        createTicketPayload([
          {
            id: 'm_video',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'Media answer',
            created_at: '2026-04-19T00:00:01.000Z',
            attachments: [
              {
                id: 'att_voice',
                ticket_id: 't_1',
                message_id: 'm_video',
                name: 'voice.webm',
                content_type: 'audio/webm',
                media_type: 'audio',
                transcript: 'hello from voice',
                size: 10,
                url: '/v1/support/attachments/att_voice',
                created_at: '2026-04-19T00:00:01.000Z'
              },
              {
                id: 'att_video',
                ticket_id: 't_1',
                message_id: 'm_video',
                name: 'circle.webm',
                content_type: 'video/webm',
                media_type: 'video',
                size: 12,
                url: '/v1/support/attachments/att_video',
                created_at: '2026-04-19T00:00:01.000Z'
              }
            ]
          }
        ])
      )
    );

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByTestId('support-chat-timeline')).toBeInTheDocument();
    const voiceTrack = screen.getByLabelText('Voice message track voice.webm');
    expect(within(voiceTrack).getByRole('button', { name: 'Play voice message' })).toBeInTheDocument();
    expect(within(voiceTrack).getByRole('button', { name: 'Расшифровать аудио' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Расшифровать аудио' })?.closest('[aria-label="Voice message track voice.webm"]')).toBe(voiceTrack);
    expect(screen.getByRole('button', { name: 'Play video message' })).toBeInTheDocument();
    expect(screen.getByLabelText('Video message circle.webm')).toBeInTheDocument();
  });

  it('uploads selected attachments before sending a user chat message', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(createTicketPayload([])))
      .mockResolvedValueOnce(
        mockJsonResponse(
          {
            attachments: [
              {
                id: 'att_1',
                ticket_id: 't_1',
                name: 'receipt.png',
                content_type: 'image/png',
                size: 8,
                url: '/v1/support/attachments/att_1'
              }
            ]
          },
          201
        )
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          {
            id: 'm_12',
            ticket_id: 't_1',
            sender_role: 'user',
            sender_name: 'demo',
            text: 'Receipt attached',
            created_at: '2026-04-19T00:00:03.000Z',
            attachments: [
              {
                id: 'att_1',
                ticket_id: 't_1',
                name: 'receipt.png',
                content_type: 'image/png',
                size: 8,
                url: '/v1/support/attachments/att_1'
              }
            ]
          },
          201
        )
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          createTicketPayload([
            {
              id: 'm_12',
              ticket_id: 't_1',
              sender_role: 'user',
              sender_name: 'demo',
              text: 'Receipt attached',
              created_at: '2026-04-19T00:00:03.000Z',
              attachments: [
                {
                  id: 'att_1',
                  ticket_id: 't_1',
                  name: 'receipt.png',
                  content_type: 'image/png',
                  size: 8,
                  url: '/v1/support/attachments/att_1'
                }
              ]
            }
          ])
        )
      );
    const user = userEvent.setup();

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    await screen.findByText('No messages yet.');
    await user.type(screen.getByTestId('withdraw-ticket-chat-input'), 'Receipt attached');
    await user.upload(screen.getByLabelText('Attach files'), new File(['fake-png'], 'receipt.png', { type: 'image/png' }));
    expect(screen.getByText('receipt.png')).toBeInTheDocument();
    await user.click(screen.getByTestId('withdraw-ticket-chat-send-button'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/v1/support/tickets/t_1/attachments',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      })
    );
    expect(fetchMock).toHaveBeenCalledWith('/v1/support/tickets/t_1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ text: 'Receipt attached', attachment_ids: ['att_1'] })
    });
  });

  it('shows telegram-style previews for selected voice and video messages before sending', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(mockJsonResponse(createTicketPayload([])));

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    await screen.findByText('No messages yet.');
    await user.upload(screen.getByLabelText('Attach files'), [
      new File(['voice'], 'voice.webm', { type: 'audio/webm' }),
      new File(['video'], 'circle.webm', { type: 'video/webm' })
    ]);

    expect(screen.getByLabelText('Voice message preview voice.webm')).toBeInTheDocument();
    expect(screen.getByLabelText('Video circle preview circle.webm')).toBeInTheDocument();
  });

  it('shows a notification when a support message arrives for the user', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(mockJsonResponse(createTicketPayload([])));

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    await screen.findByText('No messages yet.');

    act(() => {
      messageHandler?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            id: 'm_11',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'New support message',
            created_at: '2026-04-19T00:00:01.000Z'
          })
        })
      );
    });

    expect(screen.getByRole('status')).toHaveTextContent('New message from support');
  });
});
