'use client';

import { type FormEvent, useCallback, useEffect, useState } from 'react';

import type { SupportMessage, SupportTicket } from '@/src/entities/support/model/types';
import styles from '@/src/features/support/chat/ui/withdraw-ticket-chat.module.css';
import { WithdrawTicketChatTestId } from '@/src/shared/config/test-ids';

interface TicketPayload {
  ticket: SupportTicket;
  messages: SupportMessage[];
}

interface Props {
  withdrawalId: string;
}

interface LoadTicketOptions {
  preserveExisting?: boolean;
}

const REACTION_OPTIONS = [
  { emoji: '👍', label: 'thumbs up' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '🔥', label: 'fire' },
  { emoji: '👏', label: 'clap' },
  { emoji: '🎉', label: 'party' },
  { emoji: '😮', label: 'wow' }
] as const;

function mergeMessages(existing: SupportMessage[], incoming: SupportMessage[]): SupportMessage[] {
  const messageMap = new Map<
    string,
    {
      message: SupportMessage;
      order: number;
    }
  >();
  let order = 0;

  for (const message of existing) {
    messageMap.set(message.id, { message, order });
    order += 1;
  }

  for (const message of incoming) {
    if (messageMap.has(message.id)) {
      continue;
    }

    messageMap.set(message.id, { message, order });
    order += 1;
  }

  return [...messageMap.values()]
    .sort((left, right) => {
      const timeDiff = Date.parse(left.message.created_at) - Date.parse(right.message.created_at);
      if (timeDiff !== 0) {
        return timeDiff;
      }

      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.message.id.localeCompare(right.message.id);
    })
    .map(({ message }) => message);
}

function mergeTicketPayload(current: TicketPayload, incoming: TicketPayload): TicketPayload {
  return {
    ticket: incoming.ticket,
    messages: mergeMessages(current.messages, incoming.messages ?? [])
  };
}

export function WithdrawTicketChat({ withdrawalId }: Props) {
  const [payload, setPayload] = useState<TicketPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [reactionOverrides, setReactionOverrides] = useState<Record<string, string>>({});
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const loadTicket = useCallback(async (options: LoadTicketOptions = {}) => {
    const preserveExisting = options.preserveExisting ?? false;

    if (!preserveExisting) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const response = await fetch(`/v1/support/withdrawals/${withdrawalId}/ticket`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Failed to load ticket');
      }

      const data = (await response.json()) as TicketPayload;
      const nextPayload = {
        ticket: data.ticket,
        messages: data.messages ?? []
      };

      setPayload((current) => {
        if (preserveExisting && current) {
          return mergeTicketPayload(current, nextPayload);
        }

        return nextPayload;
      });
    } catch (loadError) {
      if (!preserveExisting) {
        setPayload(null);
      }

      setError(loadError instanceof Error ? loadError.message : 'Failed to load ticket');
    } finally {
      if (!preserveExisting) {
        setIsLoading(false);
      }
    }
  }, [withdrawalId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    if (!payload?.ticket.id || typeof EventSource === 'undefined') {
      return;
    }

    const eventSource = new EventSource(`/v1/support/tickets/${payload.ticket.id}/stream`);

    eventSource.addEventListener('open', () => {
      void loadTicket({ preserveExisting: true });
    });

    eventSource.addEventListener('message', (event) => {
      let nextMessage: SupportMessage;

      try {
        nextMessage = JSON.parse(event.data) as SupportMessage;
      } catch {
        return;
      }

      if (nextMessage.ticket_id !== payload.ticket.id) {
        return;
      }

      if (nextMessage.sender_role === 'support') {
        setNotification(`New message from ${nextMessage.sender_name}`);
      }

      setPayload((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          messages: mergeMessages(current.messages, [nextMessage])
        };
      });
    });

    eventSource.onerror = () => {
      setError('Live updates are temporarily unavailable.');
    };

    return () => {
      eventSource.close();
    };
  }, [loadTicket, payload?.ticket.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!payload?.ticket.id) {
      return;
    }

    const text = draft.trim();
    if (!text && files.length === 0) {
      return;
    }

    setIsSending(true);

    try {
      let attachmentIds: string[] = [];
      if (files.length > 0) {
        const formData = new FormData();
        for (const file of files) {
          formData.append('files', file);
        }

        const uploadResponse = await fetch(`/v1/support/tickets/${payload.ticket.id}/attachments`, {
          method: 'POST',
          body: formData
        });
        const uploadPayload = (await uploadResponse.json()) as {
          attachments?: Array<{ id: string }>;
        };

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload attachments');
        }

        attachmentIds = (uploadPayload.attachments ?? []).map((attachment) => attachment.id);
      }

      const response = await fetch(`/v1/support/tickets/${payload.ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(
          attachmentIds.length > 0 ? { text, attachment_ids: attachmentIds } : { text }
        )
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setDraft('');
      setFiles([]);
      await loadTicket({ preserveExisting: true });
    } catch {
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && !payload) {
    return (
      <section className={styles.root} data-testid={WithdrawTicketChatTestId.ROOT}>
        <p className={styles.state} data-testid={WithdrawTicketChatTestId.LOADING}>
          Loading chat...
        </p>
      </section>
    );
  }

  if (error && !payload) {
    return (
      <section className={styles.root} data-testid={WithdrawTicketChatTestId.ROOT}>
        <p className={styles.stateError} data-testid={WithdrawTicketChatTestId.ERROR}>
          {error}
        </p>
      </section>
    );
  }

  const messages = payload?.messages ?? [];
  const visibleMessages = messages.filter((message) => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return true;
    }

    return `${message.sender_name} ${message.text}`.toLowerCase().includes(normalizedSearch);
  });

  async function selectReaction(messageId: string, emoji: string) {
    const previousEmoji = reactionOverrides[messageId];
    setReactionOverrides((current) => ({ ...current, [messageId]: emoji }));
    setReactionPickerMessageId(null);

    try {
      const response = await fetch(`/v1/support/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });

      if (!response.ok) {
        throw new Error('Failed to save reaction');
      }
    } catch {
      setReactionOverrides((current) => {
        const next = { ...current };
        if (previousEmoji) {
          next[messageId] = previousEmoji;
        } else {
          delete next[messageId];
        }
        return next;
      });
      setError('Failed to save reaction');
    }
  }

  return (
    <section className={styles.root} data-testid={WithdrawTicketChatTestId.ROOT}>
      <div className={styles.header}>
        <h2 className={styles.title}>Support chat</h2>
        <p className={styles.subtitle}>Messages update automatically for this withdrawal.</p>
      </div>

      {error ? (
        <p className={styles.inlineError} data-testid={WithdrawTicketChatTestId.ERROR}>
          {error}
        </p>
      ) : null}

      {notification ? (
        <p className={styles.notification} role="status">
          {notification}
        </p>
      ) : null}

      <div className={styles.toolbar}>
        <label className={styles.searchLabel} htmlFor="withdraw-ticket-chat-search">
          Search
        </label>
        <input
          id="withdraw-ticket-chat-search"
          className={styles.searchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search messages"
          type="search"
        />
      </div>

      {visibleMessages.length === 0 ? (
        <p className={styles.state} data-testid={WithdrawTicketChatTestId.EMPTY}>
          {search.trim() ? 'No messages found.' : 'No messages yet.'}
        </p>
      ) : (
        <ul
          className={styles.list}
          data-testid={WithdrawTicketChatTestId.LIST}
          role="log"
          aria-label="Ticket messages"
          aria-live="polite"
          aria-relevant="additions text"
          aria-atomic="false"
        >
          {visibleMessages.map((message) => (
            <li key={message.id} className={styles.message} data-role={message.sender_role}>
              <div className={styles.messageMeta}>
                <strong className={styles.sender}>{message.sender_name}</strong>
                <span className={styles.time}>{new Date(message.created_at).toLocaleString()}</span>
              </div>
              <p className={styles.text}>{message.text}</p>
              {message.attachments && message.attachments.length > 0 ? (
                <ul className={styles.attachmentList}>
                  {message.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      {attachment.content_type.startsWith('image/') ? (
                        <a href={attachment.url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className={styles.attachmentImage}
                            src={attachment.url}
                            alt={attachment.name}
                          />
                        </a>
                      ) : (
                        <a href={attachment.url} target="_blank" rel="noreferrer">
                          {attachment.name}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className={styles.reactions}>
                <button
                  className={styles.reactionButton}
                  type="button"
                  aria-label="Choose reaction"
                  onClick={() =>
                    setReactionPickerMessageId((current) =>
                      current === message.id ? null : message.id
                    )
                  }
                >
                  {reactionOverrides[message.id] ?? message.reaction?.emoji ?? '＋'}
                </button>
                {reactionPickerMessageId === message.id ? (
                  <div className={styles.reactionPicker} role="menu">
                    {REACTION_OPTIONS.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        type="button"
                        aria-label={`React with ${reaction.label}`}
                        onClick={() => {
                          void selectReaction(message.id, reaction.emoji);
                        }}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className={styles.composer} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="withdraw-ticket-chat-input">
          Your message
        </label>
        <textarea
          id="withdraw-ticket-chat-input"
          className={styles.input}
          data-testid={WithdrawTicketChatTestId.INPUT}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message..."
          rows={3}
        />
        <div className={styles.attachments}>
          <label className={styles.fileButton} htmlFor="withdraw-ticket-chat-attachments">
            Attach files
          </label>
          <input
            id="withdraw-ticket-chat-attachments"
            className={styles.fileInput}
            type="file"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          {files.length > 0 ? (
            <ul className={styles.selectedAttachments}>
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`}>{file.name}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          className={styles.sendButton}
          data-testid={WithdrawTicketChatTestId.SEND_BUTTON}
          type="submit"
          disabled={isSending}
        >
          {isSending ? 'Sending...' : 'Send message'}
        </button>
      </form>
    </section>
  );
}
