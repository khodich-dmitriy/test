'use client';

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useMemo, useRef, useState } from 'react';

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
  currentRole: SupportChatTimelineMessage['sender_role'];
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

const AUDIO_WAVE_BAR_COUNT = 40;
const DEFAULT_AUDIO_PEAKS = Array.from({ length: AUDIO_WAVE_BAR_COUNT }, (_, index) => {
  const wave = Math.sin(index * 0.84) * 0.24 + Math.sin(index * 0.31) * 0.18;
  return Math.min(1, Math.max(0.18, 0.5 + wave));
});
const VIDEO_PROGRESS_CIRCUMFERENCE = 295;

type AudioContextConstructor = new () => AudioContext;

interface AudioWaveWindow extends Window {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
}

function getPickerPosition(button: HTMLButtonElement): CSSProperties {
  const rect = button.getBoundingClientRect();
  const width = Math.min(268, window.innerWidth - 24);
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);

  return {
    left,
    top: rect.bottom + 6
  };
}

function getLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isToday(date: Date) {
  return getLocalDateKey(date) === getLocalDateKey(new Date());
}

function formatSeparatorDate(date: Date) {
  if (isToday(date)) {
    return 'Today';
  }

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function formatMessageTime(date: Date) {
  const time = new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);

  if (isToday(date)) {
    return time;
  }

  return `${formatSeparatorDate(date)}, ${time}`;
}

function buildAudioPeaks(channelData: Float32Array, barCount = AUDIO_WAVE_BAR_COUNT): number[] {
  if (channelData.length === 0) {
    return DEFAULT_AUDIO_PEAKS;
  }

  const segmentLength = Math.max(1, Math.floor(channelData.length / barCount));
  const peaks = Array.from({ length: barCount }, (_, index) => {
    const start = index * segmentLength;
    const end = Math.min(channelData.length, start + segmentLength);
    let peak = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      peak = Math.max(peak, Math.abs(channelData[sampleIndex] ?? 0));
    }

    return peak;
  });
  const maxPeak = Math.max(...peaks, 0.01);

  return peaks.map((peak) => Math.min(1, Math.max(0.12, peak / maxPeak)));
}

async function decodeAudioPeaks(url: string): Promise<number[]> {
  const audioWindow = window as AudioWaveWindow;
  const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextCtor) {
    return DEFAULT_AUDIO_PEAKS;
  }

  const response = await fetch(url);
  if (!response.ok) {
    return DEFAULT_AUDIO_PEAKS;
  }

  const audioContext = new AudioContextCtor();
  try {
    const audioBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
    return buildAudioPeaks(audioBuffer.getChannelData(0));
  } finally {
    void audioContext.close();
  }
}

export function SupportChatTimeline({
  messages,
  currentRole,
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
  const [mediaProgressIds, setMediaProgressIds] = useState<Record<string, number>>({});
  const [mediaReadyIds, setMediaReadyIds] = useState<Record<string, boolean>>({});
  const [audioPeaksById, setAudioPeaksById] = useState<Record<string, number[]>>({});
  const mediaRefs = useRef<Record<string, HTMLMediaElement | null>>({});
  const audioPeakRequestsRef = useRef<Record<string, boolean>>({});
  const timelineItems = useMemo(() => {
    return messages.flatMap((message, index) => {
      const sentAt = new Date(message.created_at);
      const dateKey = getLocalDateKey(sentAt);
      const previousMessage = messages[index - 1];
      const previousDateKey = previousMessage
        ? getLocalDateKey(new Date(previousMessage.created_at))
        : null;
      const shouldShowSeparator = dateKey !== previousDateKey;

      return shouldShowSeparator
        ? [
            {
              id: `date-${dateKey}`,
              label: formatSeparatorDate(sentAt),
              type: 'separator' as const
            },
            {
              message,
              sentAt,
              type: 'message' as const
            }
          ]
        : [
            {
              message,
              sentAt,
              type: 'message' as const
            }
          ];
    });
  }, [messages]);

  function syncMediaProgress(id: string) {
    const media = mediaRefs.current[id];

    if (!media || !Number.isFinite(media.duration) || media.duration <= 0) {
      return;
    }

    setMediaProgressIds((current) => ({
      ...current,
      [id]: Math.min(1, Math.max(0, media.currentTime / media.duration))
    }));
  }

  function seekMediaToRatio(id: string, ratio: number) {
    const media = mediaRefs.current[id];
    const duration = Number(media?.duration);

    if (!media || !Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const nextProgress = Math.min(1, Math.max(0, ratio));
    const nextTime = duration * nextProgress;

    if (!Number.isFinite(nextTime)) {
      return;
    }

    media.currentTime = nextTime;
    setMediaProgressIds((current) => ({
      ...current,
      [id]: nextProgress
    }));
  }

  function seekMediaFromPointer(id: string, event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    seekMediaToRatio(id, (event.clientX - rect.left) / rect.width);
  }

  function seekMediaFromKeyboard(id: string, event: KeyboardEvent<HTMLDivElement>) {
    const currentProgress = mediaProgressIds[id] ?? 0;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      seekMediaToRatio(id, currentProgress - 0.05);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      seekMediaToRatio(id, currentProgress + 0.05);
    } else if (event.key === 'Home') {
      event.preventDefault();
      seekMediaToRatio(id, 0);
    } else if (event.key === 'End') {
      event.preventDefault();
      seekMediaToRatio(id, 1);
    }
  }

  function ensureAudioPeaks(attachment: SupportMessageAttachment) {
    if (audioPeaksById[attachment.id] || audioPeakRequestsRef.current[attachment.id]) {
      return;
    }

    audioPeakRequestsRef.current[attachment.id] = true;
    void decodeAudioPeaks(attachment.url)
      .then((peaks) => {
        setAudioPeaksById((current) => ({
          ...current,
          [attachment.id]: peaks
        }));
      })
      .catch(() => {
        setAudioPeaksById((current) => ({
          ...current,
          [attachment.id]: DEFAULT_AUDIO_PEAKS
        }));
      })
      .finally(() => {
        delete audioPeakRequestsRef.current[attachment.id];
      });
  }

  function toggleMedia(id: string, attachment?: SupportMessageAttachment) {
    const media = mediaRefs.current[id];
    if (!media) {
      return;
    }

    if (attachment?.content_type.startsWith('audio/')) {
      ensureAudioPeaks(attachment);
    }

    const isPlaying = Boolean(playingMediaIds[id]) || !media.paused;

    if (!isPlaying) {
      if (!media.getAttribute('src') && media.dataset.src) {
        media.setAttribute('src', media.dataset.src);
        media.load();
      }
      setPlayingMediaIds((current) => ({ ...current, [id]: true }));
      const playPromise = media.play();

      if (playPromise) {
        void playPromise.catch(() => {
          setPlayingMediaIds((current) => ({ ...current, [id]: false }));
        });
      }

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
      {timelineItems.map((item) => {
        if (item.type === 'separator') {
          return (
            <li key={item.id} className={styles.dateSeparator} role="presentation">
              <span>{item.label}</span>
            </li>
          );
        }

        const { message, sentAt } = item;
        const sentAtLabel = formatMessageTime(sentAt);
        const author = message.sender_role === currentRole ? 'own' : 'other';

        return (
          <li
            key={message.id}
            className={styles.message}
            data-role={message.sender_role}
            data-author={author}
          >
            <div className={styles.messageMeta}>
              <strong className={styles.sender}>{message.sender_name}</strong>
              <span className={styles.time} aria-label={`Sent at ${sentAtLabel}`}>
                {sentAtLabel}
              </span>
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
                            onClick={() => toggleMedia(attachment.id, attachment)}
                          >
                            {playingMediaIds[attachment.id] ? 'Ⅱ' : '▶'}
                          </button>
                          <div
                            className={styles.voiceWave}
                            role="slider"
                            tabIndex={0}
                            aria-label={`Seek voice message ${attachment.name}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round((mediaProgressIds[attachment.id] ?? 0) * 100)}
                            onPointerDown={(event) => seekMediaFromPointer(attachment.id, event)}
                            onPointerMove={(event) => {
                              if (event.buttons === 1) {
                                seekMediaFromPointer(attachment.id, event);
                              }
                            }}
                            onKeyDown={(event) => seekMediaFromKeyboard(attachment.id, event)}
                          >
                            {(audioPeaksById[attachment.id] ?? DEFAULT_AUDIO_PEAKS).map((peak, index, peaks) => (
                              <span
                                key={index}
                                className={styles.voiceWaveBar}
                                data-played={
                                  (mediaProgressIds[attachment.id] ?? 0) >= index / Math.max(1, peaks.length - 1)
                                    ? 'true'
                                    : 'false'
                                }
                                style={
                                  {
                                    '--wave-height': `${Math.round(7 + peak * 23)}px`
                                  } as CSSProperties
                                }
                              />
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
                          aria-label={`Audio player ${attachment.name}`}
                          src={attachment.url}
                          preload="metadata"
                          onLoadedMetadata={() => {
                            syncMediaProgress(attachment.id);
                            ensureAudioPeaks(attachment);
                          }}
                          onTimeUpdate={() => syncMediaProgress(attachment.id)}
                          onEnded={() => {
                            setPlayingMediaIds((current) => ({ ...current, [attachment.id]: false }));
                            setMediaProgressIds((current) => ({ ...current, [attachment.id]: 1 }));
                          }}
                        />
                        {visibleTranscriptIds[attachment.id] && attachment.transcript ? (
                          <p className={styles.transcript}>{attachment.transcript}</p>
                        ) : null}
                        {visibleTranscriptIds[attachment.id] && !attachment.transcript ? (
                          <p className={styles.transcript}>Расшифровка доступна для записанных голосовых сообщений.</p>
                        ) : null}
                      </div>
                  ) : attachment.content_type.startsWith('video/') ? (
                    <div className={styles.videoBlock}>
                      <div className={styles.videoBubble}>
                        <video
                          ref={(element) => {
                            mediaRefs.current[attachment.id] = element;
                          }}
                          className={styles.videoAttachment}
                          data-src={attachment.url}
                          data-ready={mediaReadyIds[attachment.id] ? 'true' : 'false'}
                          aria-label={`Video message ${attachment.name}`}
                          playsInline
                          preload="none"
                          onClick={() => toggleMedia(attachment.id)}
                          onLoadedData={() => {
                            setMediaReadyIds((current) => ({ ...current, [attachment.id]: true }));
                            syncMediaProgress(attachment.id);
                          }}
                          onTimeUpdate={() => syncMediaProgress(attachment.id)}
                          onPlay={() =>
                            setPlayingMediaIds((current) => ({ ...current, [attachment.id]: true }))
                          }
                          onPause={() =>
                            setPlayingMediaIds((current) => ({ ...current, [attachment.id]: false }))
                          }
                          onEnded={() => {
                            setPlayingMediaIds((current) => ({ ...current, [attachment.id]: false }));
                            setMediaProgressIds((current) => ({ ...current, [attachment.id]: 1 }));
                          }}
                        />
                        {!mediaReadyIds[attachment.id] ? (
                          <button
                            className={styles.videoPlaceholder}
                            type="button"
                            aria-label={`Video preview ${attachment.name}`}
                            onClick={() => toggleMedia(attachment.id)}
                          >
                            <span aria-hidden="true" />
                          </button>
                        ) : null}
                        <svg
                          className={styles.videoProgress}
                          viewBox="0 0 100 100"
                          role="progressbar"
                          aria-label={`Video playback progress ${attachment.name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round((mediaProgressIds[attachment.id] ?? 0) * 100)}
                          data-started={
                            playingMediaIds[attachment.id] || (mediaProgressIds[attachment.id] ?? 0) > 0
                              ? 'true'
                              : 'false'
                          }
                        >
                          <circle className={styles.videoProgressTrack} cx="50" cy="50" r="47" />
                          <circle
                            className={styles.videoProgressValue}
                            cx="50"
                            cy="50"
                            r="47"
                            style={{
                              strokeDasharray: VIDEO_PROGRESS_CIRCUMFERENCE,
                              strokeDashoffset:
                                VIDEO_PROGRESS_CIRCUMFERENCE -
                                VIDEO_PROGRESS_CIRCUMFERENCE * (mediaProgressIds[attachment.id] ?? 0)
                            }}
                          />
                        </svg>
                        <button
                          className={styles.videoPlayButton}
                          type="button"
                          data-state={playingMediaIds[attachment.id] ? 'playing' : 'paused'}
                          aria-label={playingMediaIds[attachment.id] ? 'Pause video message' : 'Play video message'}
                          onClick={() => toggleMedia(attachment.id)}
                        >
                          <span
                            className={styles.videoPlayIcon}
                            data-state={playingMediaIds[attachment.id] ? 'playing' : 'paused'}
                            data-video-pause-icon={playingMediaIds[attachment.id] ? 'true' : undefined}
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          className={styles.videoTranscribeButton}
                          type="button"
                          aria-label="Расшифровать видео"
                          title="Расшифровать видео"
                          onClick={() => onToggleTranscript(attachment.id)}
                        >
                          <TranscriptIcon />
                        </button>
                      </div>
                      {visibleTranscriptIds[attachment.id] && attachment.transcript ? (
                        <p className={styles.transcript}>{attachment.transcript}</p>
                      ) : null}
                      {visibleTranscriptIds[attachment.id] && !attachment.transcript ? (
                        <p className={styles.transcript}>Расшифровка доступна для записанных видео сообщений.</p>
                      ) : null}
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
        );
      })}
    </ul>
  );
}
