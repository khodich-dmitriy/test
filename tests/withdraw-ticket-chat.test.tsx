import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

type MockRecorderInstance = {
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  requestData: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
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
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('retries the first chat load after refreshing an expired access cookie', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(mockJsonResponse({ ok: true }))
      .mockResolvedValueOnce(
        mockJsonResponse(
          createTicketPayload([
            {
              id: 'm_refresh',
              ticket_id: 't_1',
              sender_role: 'support',
              sender_name: 'support',
              text: 'Loaded after refresh',
              created_at: '2026-04-19T00:00:01.000Z'
            }
          ])
        )
      );

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByText('Loaded after refresh')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/auth/refresh', { method: 'POST' });
  });

  it('deduplicates repeated SSE messages by id', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(mockJsonResponse(createTicketPayload([])));

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    await screen.findByText('No messages yet.');
    await waitFor(() => expect(messageHandler).toBeTruthy());

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

  it('marks user messages as own and support messages as other in the client chat', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(
        createTicketPayload([
          {
            id: 'm_user',
            ticket_id: 't_1',
            sender_role: 'user',
            sender_name: 'demo',
            text: 'My client message',
            created_at: '2026-04-19T00:00:01.000Z'
          },
          {
            id: 'm_support',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'Support answer',
            created_at: '2026-04-19T00:00:02.000Z'
          }
        ])
      )
    );

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByText('My client message')).toBeInTheDocument();
    expect(screen.getByText('My client message').closest('[data-author]')).toHaveAttribute(
      'data-author',
      'own'
    );
    expect(screen.getByText('Support answer').closest('[data-author]')).toHaveAttribute(
      'data-author',
      'other'
    );
  });

  it('does not reload the full ticket when the live stream opens', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(
        createTicketPayload([
          {
            id: 'm_initial',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'Initial payload',
            created_at: '2026-04-19T00:00:01.000Z'
          }
        ])
      )
    );

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByText('Initial payload')).toBeInTheDocument();
    await waitFor(() => expect(eventSourceInstance).toBeTruthy());

    act(() => {
      eventSourceInstance?.emitOpen();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves payload when the live stream errors without reloading the full ticket', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
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
    );

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByText('Initial payload')).toBeInTheDocument();
    await waitFor(() => expect(eventSourceInstance).toBeTruthy());

    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      eventSourceInstance?.emitError();
    });

    expect(screen.getByText('Initial payload')).toBeInTheDocument();
    expect(screen.getByText('Live updates are reconnecting...')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(closeMock).not.toHaveBeenCalled();
  });

  it('keeps the existing payload when live messages arrive after stream connection', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
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

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByText('Initial payload')).toBeInTheDocument();
    await waitFor(() => expect(messageHandler).toBeTruthy());

    act(() => {
      messageHandler?.(
        new MessageEvent('message', {
          data: JSON.stringify({
            id: 'm_7',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'Live payload',
            created_at: '2026-04-19T00:00:02.000Z'
          })
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Live payload')).toBeInTheDocument();
    });
    expect(screen.getByText('Initial payload')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
                transcript: 'hello from video',
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
    const voiceSeek = within(voiceTrack).getByRole('slider', { name: 'Seek voice message voice.webm' });
    expect(voiceSeek).toHaveAttribute('aria-valuemin', '0');
    expect(voiceSeek).toHaveAttribute('aria-valuemax', '100');
    expect(voiceSeek).toHaveAttribute('aria-valuenow', '0');
    const voiceAudio = screen.getByLabelText('Audio player voice.webm') as HTMLAudioElement;
    let audioCurrentTime = 0;
    Object.defineProperty(voiceAudio, 'duration', { get: () => 20, configurable: true });
    Object.defineProperty(voiceAudio, 'currentTime', {
      get: () => audioCurrentTime,
      set: (value) => {
        audioCurrentTime = value;
      },
      configurable: true
    });
    vi.spyOn(voiceSeek, 'getBoundingClientRect').mockReturnValue({
      bottom: 20,
      height: 20,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    fireEvent(voiceSeek, new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 50 }));

    expect(voiceAudio.currentTime).toBe(10);
    expect(voiceSeek).toHaveAttribute('aria-valuenow', '50');
    expect(screen.queryByRole('button', { name: 'Расшифровать аудио' })?.closest('[aria-label="Voice message track voice.webm"]')).toBe(voiceTrack);
    expect(screen.getByLabelText('Video playback progress circle.webm')).toBeInTheDocument();
    const playVideoButton = screen.getByRole('button', { name: 'Play video message' });
    expect(playVideoButton).toBeInTheDocument();
    const videoMessage = screen.getByLabelText('Video message circle.webm');
    expect(videoMessage).toBeInTheDocument();
    expect(videoMessage).not.toHaveAttribute('src');
    expect(videoMessage).toHaveAttribute('data-src', '/v1/support/attachments/att_video');
    expect(screen.getByLabelText('Video preview circle.webm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Расшифровать видео' })).toBeInTheDocument();

    await userEvent.click(playVideoButton);

    expect(videoMessage).toHaveAttribute('src', '/v1/support/attachments/att_video');
    const pauseVideoButton = screen.getByRole('button', { name: 'Pause video message' });
    expect(pauseVideoButton).toBeInTheDocument();
    expect(pauseVideoButton).toHaveAttribute('data-state', 'playing');
    expect(pauseVideoButton.querySelector('[data-video-pause-icon="true"]')).toBeInTheDocument();

    await userEvent.click(pauseVideoButton);

    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play video message' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Расшифровать видео' }));

    expect(screen.getByText('hello from video')).toBeInTheDocument();
  });

  it('keeps recorded video playable by uploading the recorder mime type and collected bytes', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(createTicketPayload([])))
      .mockResolvedValueOnce(mockJsonResponse({ attachments: [{ id: 'att_video' }] }, 201))
      .mockResolvedValueOnce(
        mockJsonResponse({
          id: 'm_video_send',
          ticket_id: 't_1',
          sender_role: 'user',
          sender_name: 'demo',
          text: '',
          created_at: '2026-04-19T00:00:03.000Z'
        }, 201)
      )
      .mockResolvedValueOnce(mockJsonResponse(createTicketPayload([])));
    const trackStop = vi.fn();
    const stream = {
      getTracks: () => [{ stop: trackStop }]
    } as unknown as MediaStream;
    const recorderInstances: MockRecorderInstance[] = [];
    class MockMediaRecorder {
      static isTypeSupported = vi.fn((mimeType: string) => mimeType === 'video/mp4');
      mimeType = 'video/mp4';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      requestData = vi.fn(() => {
        this.ondataavailable?.({ data: new Blob(['video-bytes'], { type: this.mimeType }) });
      });
      start = vi.fn();
      stop = vi.fn(() => {
        this.requestData();
        this.onstop?.();
      });

      constructor() {
        recorderInstances.push(this);
      }
    }
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      start = vi.fn(() => {
        this.onresult?.({
          results: [[{ transcript: 'video words' }]]
        });
      });
      stop = vi.fn();
    }
    vi.stubGlobal('MediaRecorder', MockMediaRecorder as unknown as typeof MediaRecorder);
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream)
      }
    });
    const user = userEvent.setup();

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    await screen.findByText('No messages yet.');
    await user.click(screen.getByRole('button', { name: 'Record video circle' }));
    const recordingPreview = await screen.findByLabelText('Recording video fullscreen preview');
    await user.click(within(recordingPreview).getByRole('button', { name: 'Stop video recording' }));
    await screen.findByText(/video-\d+\.mp4/);
    await user.click(screen.getByTestId('withdraw-ticket-chat-send-button'));

    const uploadCall = fetchMock.mock.calls.find(([url]) => url === '/v1/support/tickets/t_1/attachments');
    const uploadedFormData = uploadCall?.[1]?.body as FormData;
    const uploadedFile = uploadedFormData.get('files') as File;

    expect(recorderInstances[0]?.requestData).toHaveBeenCalled();
    expect(uploadedFile.type).toBe('video/mp4');
    expect(uploadedFile.size).toBeGreaterThan(0);
    expect(uploadedFormData.get(`transcript:${uploadedFile.name}`)).toBe('video words');
    expect(trackStop).toHaveBeenCalled();
  });

  it('separates chat messages by date and shows full send date for older messages', async () => {
    const todayIso = new Date().toISOString();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(
        createTicketPayload([
          {
            id: 'm_old',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'Older message',
            created_at: '2026-04-19T00:00:01.000Z'
          },
          {
            id: 'm_today',
            ticket_id: 't_1',
            sender_role: 'support',
            sender_name: 'support',
            text: 'Today message',
            created_at: todayIso
          }
        ])
      )
    );

    render(<WithdrawTicketChat withdrawalId="w_1" />);

    expect(await screen.findByText('Older message')).toBeInTheDocument();
    expect(screen.getByText('Today message')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getAllByText(/Apr|19|2026/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Sent at Apr|Sent at .*2026/)).toBeInTheDocument();
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
