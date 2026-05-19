'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { SupportMessage, SupportTicket, SupportUser } from '../../../entities/support/model/types';
import { SendMessageForm } from '../../../features/chat/send/ui/send-message-form';
import styles from './ticket-chat-page.module.css';

const REACTION_OPTIONS = [
  { emoji: '👍', label: 'thumbs up' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '🔥', label: 'fire' },
  { emoji: '👏', label: 'clap' },
  { emoji: '🎉', label: 'party' },
  { emoji: '😮', label: 'wow' }
] as const;

interface TicketPayload {
  ticket: SupportTicket;
  user: SupportUser;
  messages: SupportMessage[];
}

interface Props {
  ticketId: string;
  initialPayload: TicketPayload;
}

function appendUniqueMessage(
  messages: SupportMessage[],
  nextMessage: SupportMessage
): SupportMessage[] {
  if (messages.some((message) => message.id === nextMessage.id)) {
    return messages;
  }

  return [...messages, nextMessage];
}

export function TicketChatPage({ ticketId, initialPayload }: Props) {
  const [payload, setPayload] = useState<TicketPayload | null>(initialPayload);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [reactionOverrides, setReactionOverrides] = useState<Record<string, string>>({});
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);

  async function loadTicket() {
    try {
      const response = await fetch(`/v1/support/tickets/${ticketId}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to refresh ticket');
      }

      const data = (await response.json()) as TicketPayload;
      setPayload(data);
      setRefreshError(null);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Failed to refresh ticket');
    }
  }

  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      return;
    }

    const eventSource = new EventSource(`/v1/support/tickets/${ticketId}/stream`);
    eventSource.addEventListener('message', (event) => {
      let nextMessage: SupportMessage;
      try {
        nextMessage = JSON.parse(event.data) as SupportMessage;
      } catch {
        return;
      }

      setPayload((current) => {
        if (!current) {
          return current;
        }

        if (nextMessage.sender_role === 'user') {
          setNotification(`New message from ${nextMessage.sender_name}`);
        }

        return {
          ...current,
          messages: appendUniqueMessage(current.messages, nextMessage)
        };
      });
    });
    return () => {
      eventSource.close();
    };
  }, [ticketId]);

  const orderedMessages = useMemo(() => payload?.messages ?? [], [payload]);
  const visibleMessages = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return orderedMessages;
    }

    return orderedMessages.filter((message) =>
      `${message.sender_name} ${message.text}`.toLowerCase().includes(normalizedSearch)
    );
  }, [orderedMessages, search]);

  async function selectReaction(messageId: string, emoji: string) {
    const previousEmoji = reactionOverrides[messageId];
    setReactionOverrides((current) => ({ ...current, [messageId]: emoji }));
    setReactionPickerMessageId(null);

    try {
      const response = await fetch(`/v1/support/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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
      setRefreshError('Failed to save reaction');
    }
  }

  if (!payload) {
    return <main className={styles.page}>Loading ticket...</main>;
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href={`/users/${payload.user.id}`}>
        Back to user
      </Link>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Ticket conversation</p>
          <h1 className={styles.title}>{payload.ticket.subject}</h1>
          <p className={styles.subtitle}>User: {payload.user.username}</p>
        </div>
        <div className={styles.summary}>
          <span className={styles.summaryBadge}>{payload.ticket.status}</span>
          <span className={styles.summaryMeta}>Ticket {payload.ticket.id}</span>
        </div>
      </section>

      <section className={styles.chatShell} aria-label="Ticket chat">
        {refreshError ? (
          <p className={styles.refreshError} role="status">
            {refreshError}
          </p>
        ) : null}
        {notification ? (
          <p className={styles.notification} role="status">
            {notification}
          </p>
        ) : null}

        <div className={styles.toolbar}>
          <label className={styles.searchLabel} htmlFor="support-ticket-chat-search">
            Search
          </label>
          <input
            id="support-ticket-chat-search"
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search messages"
            type="search"
          />
        </div>

        {visibleMessages.length === 0 ? (
          <p className={styles.emptyState}>
            {search.trim() ? 'No messages found.' : 'No messages yet.'}
          </p>
        ) : (
          <ul
            className={styles.messageList}
            role="log"
            aria-label="Ticket messages"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {visibleMessages.map((message) => (
              <li key={message.id} className={styles.message} data-role={message.sender_role}>
                <div className={styles.messageMeta}>
                  <strong className={styles.sender}>{message.sender_name}</strong>
                  <span className={styles.time}>
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
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

        <div className={styles.composerWrap}>
          <SendMessageForm
            ticketId={ticketId}
            onSent={() => {
              void loadTicket();
            }}
          />
        </div>
      </section>
    </main>
  );
}
