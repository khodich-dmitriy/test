'use client';

import Link from 'next/link';
import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  mergeSupportMessages,
  playChatNotificationSound,
  withReaction
} from '../../../../../shared/support-chat/chat-core';
import { SupportChatTimeline } from '../../../../../shared/support-chat/support-chat-timeline';
import type { SupportMessage, SupportTicket, SupportUser } from '../../../entities/support/model/types';
import { SendMessageForm } from '../../../features/chat/send/ui/send-message-form';
import styles from './ticket-chat-page.module.css';

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
  return mergeSupportMessages(messages, [nextMessage]);
}

export function TicketChatPage({ ticketId, initialPayload }: Props) {
  const [payload, setPayload] = useState<TicketPayload | null>(initialPayload);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [reactionOverrides, setReactionOverrides] = useState<Record<string, string>>({});
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);
  const [visibleTranscriptIds, setVisibleTranscriptIds] = useState<Record<string, boolean>>({});
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          playChatNotificationSound(window);
        }

        return {
          ...current,
          messages: appendUniqueMessage(current.messages, nextMessage)
        };
      });
    });
    eventSource.addEventListener('reaction', ((event: MessageEvent) => {
      let chatEvent: { reaction?: SupportMessage['reaction'] };
      try {
        chatEvent = JSON.parse(event.data) as { reaction?: SupportMessage['reaction'] };
      } catch {
        return;
      }

      if (!chatEvent.reaction) {
        return;
      }
      const reaction = chatEvent.reaction;

      setPayload((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          messages: withReaction(current.messages, reaction)
        };
      });
    }) as EventListener);
    return () => {
      eventSource.close();
    };
  }, [ticketId]);

  useEffect(
    () => () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    },
    []
  );

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

  function openReactionOnTouch(event: PointerEvent<HTMLButtonElement>, messageId: string) {
    if (event.pointerType !== 'touch') {
      return;
    }

    touchTimerRef.current = setTimeout(() => {
      setReactionPickerMessageId(messageId);
    }, 350);
  }

  function cancelTouchReaction() {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
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
          <SupportChatTimeline
            messages={visibleMessages}
            reactionOverrides={reactionOverrides}
            reactionPickerMessageId={reactionPickerMessageId}
            visibleTranscriptIds={visibleTranscriptIds}
            emptyLabel={search.trim() ? 'No messages found.' : 'No messages yet.'}
            onToggleReactionPicker={setReactionPickerMessageId}
            onSelectReaction={(messageId, emoji) => {
              void selectReaction(messageId, emoji);
            }}
            onOpenReactionTouch={openReactionOnTouch}
            onCancelTouchReaction={cancelTouchReaction}
            onReply={(message) => setReplyTo(message as SupportMessage)}
            onToggleTranscript={(attachmentId) =>
              setVisibleTranscriptIds((current) => ({
                ...current,
                [attachmentId]: !current[attachmentId]
              }))
            }
          />
        )}

        <div className={styles.composerWrap}>
          <SendMessageForm
            ticketId={ticketId}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSent={(message) => {
              setPayload((current) =>
                current
                  ? {
                      ...current,
                      messages: appendUniqueMessage(current.messages, message)
                    }
                  : current
              );
            }}
          />
        </div>
      </section>
    </main>
  );
}
