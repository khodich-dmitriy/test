'use client';

import { type CSSProperties, type PointerEvent, useRef, useState } from 'react';

import { SUPPORT_REACTION_OPTIONS } from './chat-core';
import styles from './support-chat-timeline.module.css';
import { TranscriptIcon } from './transcript-icon';

interface SupportMessageReply {
  sender_name: string;
  text: string;
}

interface SupportMessageAttachment {
  id: string;
  name: string;
  content_type: string;
  transcript?: string | null;
  url: string;
}

export interface SupportChatTimelineMessage {
  id: string;
  sender_role: 'user' | 'support';
  sender_name: string;
  text: string;
  created_at: string;
  reply_to?: SupportMessageReply | null;
  attachments?: SupportMessageAttachment[];
  reaction?: {
    emoji: string;
  } | null;
}

interface Props {
  messages: SupportChatTimelineMessage[];
  reactionOverrides: Record<string, string>;
  reactionPickerMessageId: string | null;
  visibleTranscriptIds: Record<string, boolean>;
  emptyLabel: string;
  onToggleReactionPicker: (messageId: string | null) => void;
  onSelectReaction: (messageId: string, emoji: string) => void;
  onOpenReactionTouch: (event: PointerEvent<HTMLButtonElement>, messageId: string) => void;
  onCancelTouchReaction: () => void;
  onReply: (message: SupportChatTimelineMessage) => void;
  onToggleTranscript: (attachmentId: string) => void;
}

const WAVE_BARS = Array.from({ length: 18 }, (_, index) => index);

function getPickerPosition(button: HTMLButtonElement): CSSProperties {
  const rect = button.getBoundingClientRect();
  const width = Math.min(268, window.innerWidth - 24);
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);

  return {
    left,
    top: rect.bottom + 6
  };
}

export function SupportChatTimeline({
  messages,
  reactionOverrides,
  reactionPickerMessageId,
  visibleTranscriptIds,
  emptyLabel,
  onToggleReactionPicker,
  onSelectReaction,
  onOpenReactionTouch,
  onCancelTouchReaction,
  onReply,
  onToggleTranscript
}: Props) {
  const [pickerStyle, setPickerStyle] = useState<CSSProperties>({});
  const [playingMediaIds, setPlayingMediaIds] = useState<Record<string, boolean>>({});
  const mediaRefs = useRef<Record<string, HTMLMediaElement | null>>({});

  function toggleMedia(id: string) {
    const media = mediaRefs.current[id];
    if (!media) {
      return;
    }

    if (media.paused) {
      void media.play();
      setPlayingMediaIds((current) => ({ ...current, [id]: true }));
      return;
    }

    media.pause();
    setPlayingMediaIds((current) => ({ ...current, [id]: false }));
  }

  if (messages.length === 0) {
    return <p className={styles.emptyState}>{emptyLabel}</p>;
  }

  return (
    <ul
      className={styles.list}
      data-testid="support-chat-timeline"
      role="log"
      aria-label="Ticket messages"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
    >
      {messages.map((message) => (
        <li key={message.id} className={styles.message} data-role={message.sender_role}>
          <div className={styles.messageMeta}>
            <strong className={styles.sender}>{message.sender_name}</strong>
            <span className={styles.time}>{new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
          {message.text ? <p className={styles.text}>{message.text}</p> : null}
          {message.reply_to ? (
            <blockquote className={styles.replyPreview}>
              <strong>{message.reply_to.sender_name}</strong>
              <span>{message.reply_to.text}</span>
            </blockquote>
          ) : null}
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
                  ) : attachment.content_type.startsWith('audio/') ? (
                    <div className={styles.voiceBlock}>
                      <div
                        className={styles.voiceTrack}
                        aria-label={`Voice message track ${attachment.name}`}
                      >
                        <button
                          className={styles.voicePlayButton}
                          type="button"
                          aria-label={playingMediaIds[attachment.id] ? 'Pause voice message' : 'Play voice message'}
                          onClick={() => toggleMedia(attachment.id)}
                        >
                          {playingMediaIds[attachment.id] ? 'Ⅱ' : '▶'}
                        </button>
                        <div className={styles.voiceWave} aria-hidden="true">
                          {WAVE_BARS.map((index) => (
                            <span key={index} />
                          ))}
                        </div>
                        <button
                          className={styles.transcribeButton}
                          type="button"
                          aria-label="Расшифровать аудио"
                          title="Расшифровать аудио"
                          onClick={() => onToggleTranscript(attachment.id)}
                        >
                          <TranscriptIcon />
                        </button>
                      </div>
                      <audio
                        ref={(element) => {
                          mediaRefs.current[attachment.id] = element;
                        }}
                        className={styles.voicePlayer}
                        src={attachment.url}
                        preload="metadata"
                        onEnded={() =>
                          setPlayingMediaIds((current) => ({ ...current, [attachment.id]: false }))
                        }
                      />
                      {visibleTranscriptIds[attachment.id] && attachment.transcript ? (
                        <p className={styles.transcript}>{attachment.transcript}</p>
                      ) : null}
                      {visibleTranscriptIds[attachment.id] && !attachment.transcript ? (
                        <p className={styles.transcript}>Расшифровка доступна для записанных голосовых сообщений.</p>
                      ) : null}
                    </div>
                  ) : attachment.content_type.startsWith('video/') ? (
                    <div className={styles.videoBubble}>
                      <video
                        ref={(element) => {
                          mediaRefs.current[attachment.id] = element;
                        }}
                        className={styles.videoAttachment}
                        src={attachment.url}
                        aria-label={`Video message ${attachment.name}`}
                        playsInline
                        preload="metadata"
                        onEnded={() =>
                          setPlayingMediaIds((current) => ({ ...current, [attachment.id]: false }))
                        }
                      />
                      <button
                        className={styles.videoPlayButton}
                        type="button"
                        aria-label={playingMediaIds[attachment.id] ? 'Pause video message' : 'Play video message'}
                        onClick={() => toggleMedia(attachment.id)}
                      >
                        {playingMediaIds[attachment.id] ? 'Ⅱ' : '▶'}
                      </button>
                    </div>
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
              onClick={(event) => {
                setPickerStyle(getPickerPosition(event.currentTarget));
                onToggleReactionPicker(reactionPickerMessageId === message.id ? null : message.id);
              }}
              onPointerDown={(event) => {
                setPickerStyle(getPickerPosition(event.currentTarget));
                onOpenReactionTouch(event, message.id);
              }}
              onPointerLeave={onCancelTouchReaction}
              onPointerUp={onCancelTouchReaction}
            >
              {reactionOverrides[message.id] ?? message.reaction?.emoji ?? '+'}
            </button>
            {reactionPickerMessageId === message.id ? (
              <div className={styles.reactionPicker} style={pickerStyle} role="menu">
                {SUPPORT_REACTION_OPTIONS.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    type="button"
                    aria-label={`React with ${reaction.label}`}
                    onClick={() => onSelectReaction(message.id, reaction.emoji)}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              className={styles.replyButton}
              type="button"
              aria-label="Ответить на сообщение"
              title="Ответить на сообщение"
              onClick={() => onReply(message)}
            >
              ↩
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
