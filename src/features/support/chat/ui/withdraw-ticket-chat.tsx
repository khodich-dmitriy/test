'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

import {
  appendFilesToChatFormData,
  buildChatMessagePayload,
  createRecordedFile,
  getSupportedRecordingMimeType,
  mergeSupportMessages,
  playChatNotificationSound,
  withReaction
} from '@/shared/support-chat/chat-core';
import { RecordingMediaPreview } from '@/shared/support-chat/recording-media-preview';
import { SelectedAttachmentPreviews } from '@/shared/support-chat/selected-attachment-previews';
import { SupportChatTimeline } from '@/shared/support-chat/support-chat-timeline';
import type { SupportMessage, SupportTicket } from '@/src/entities/support/model/types';
import styles from '@/src/features/support/chat/ui/withdraw-ticket-chat.module.css';
import { request, requestJson } from '@/src/shared/api/http-client';
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

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
};

interface MediaWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface ChatFormValues {
  text: string;
}

const chatFormSchema: yup.ObjectSchema<ChatFormValues> = yup
  .object({
    text: yup.string().defined()
  })
  .required();

function mergeTicketPayload(current: TicketPayload, incoming: TicketPayload): TicketPayload {
  return {
    ticket: incoming.ticket,
    messages: mergeSupportMessages(current.messages, incoming.messages ?? [])
  };
}

function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

export function WithdrawTicketChat({ withdrawalId }: Props) {
  const [payload, setPayload] = useState<TicketPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [reactionOverrides, setReactionOverrides] = useState<Record<string, string>>({});
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [recordingVideoStream, setRecordingVideoStream] = useState<MediaStream | null>(null);
  const [visibleTranscriptIds, setVisibleTranscriptIds] = useState<Record<string, boolean>>({});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    handleSubmit: handleFormSubmit,
    register,
    reset,
    formState: { isSubmitting }
  } = useForm<ChatFormValues>({
    resolver: yupResolver(chatFormSchema),
    defaultValues: { text: '' },
    mode: 'onChange'
  });

  const loadTicket = useCallback(async (options: LoadTicketOptions = {}) => {
    const preserveExisting = options.preserveExisting ?? false;

    if (!preserveExisting) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const data = await requestJson<TicketPayload>(
        `/v1/support/withdrawals/${withdrawalId}/ticket`,
        {
          cache: 'no-store'
        },
        {
          retryOnUnauthorized: true
        }
      );
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

      setError(getRequestErrorMessage(loadError, 'Failed to load ticket'));
    } finally {
      if (!preserveExisting) {
        setIsLoading(false);
      }
    }
  }, [withdrawalId]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  useEffect(
    () => () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
      recognitionRef.current?.stop();
      recorderRef.current?.stop();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  async function startRecording(kind: 'audio' | 'video') {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser.');
      return;
    }

    const timestamp = Date.now();
    const chunks: Blob[] = [];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === 'video'
    });
    const supportedMimeType = getSupportedRecordingMimeType(kind);
    const recorder = new MediaRecorder(
      stream,
      supportedMimeType ? { mimeType: supportedMimeType } : undefined
    );
    const recordingMimeType =
      recorder.mimeType || supportedMimeType || (kind === 'video' ? 'video/webm' : 'audio/webm');
    const fileName = createRecordedFile(kind, timestamp, [], recordingMimeType).name;
    recorderRef.current = recorder;
    recordingStreamRef.current = stream;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onstop = () => {
      const file = createRecordedFile(kind, timestamp, chunks, recordingMimeType);
      setUploadStatus(`${kind === 'video' ? 'Video circle' : 'Voice message'} is ready to send`);
      setFiles((current) => [...current, file]);
      stream.getTracks().forEach((track) => track.stop());
      if (recordingStreamRef.current === stream) {
        recordingStreamRef.current = null;
      }
      if (recorderRef.current === recorder) {
        recorderRef.current = null;
      }
      if (kind === 'video') {
        setRecordingVideoStream(null);
      }
    };

    const mediaWindow = window as MediaWindow;
    const Recognition = mediaWindow.SpeechRecognition ?? mediaWindow.webkitSpeechRecognition;
    if (Recognition) {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'ru-RU';
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? '')
          .join(' ')
          .trim();
        if (transcript) {
          setTranscripts((current) => ({ ...current, [fileName]: transcript }));
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
    }

    if (kind === 'audio') {
      setIsRecordingAudio(true);
      setUploadStatus('Recording voice message...');
    } else {
      setRecordingVideoStream(stream);
      setIsRecordingVideo(true);
      setUploadStatus('Recording video circle...');
    }

    recorder.start();
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.requestData();
      recorder.stop();
    }
    setIsRecordingAudio(false);
    setIsRecordingVideo(false);
  }

  useEffect(() => {
    if (!payload?.ticket.id || typeof EventSource === 'undefined') {
      return;
    }

    const eventSource = new EventSource(`/v1/support/tickets/${payload.ticket.id}/stream`);

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
        playChatNotificationSound(window);
      }

      setPayload((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          messages: mergeSupportMessages(current.messages, [nextMessage])
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

    eventSource.onerror = () => {
      setNotification('Live updates are reconnecting...');
    };

    return () => {
      eventSource.close();
    };
  }, [loadTicket, payload?.ticket.id]);

  const submitMessage = async (values: ChatFormValues) => {
    if (!payload?.ticket.id) {
      return;
    }

    const text = values.text.trim();
    if (!text && files.length === 0) {
      return;
    }

    setIsSending(true);

    try {
      let attachmentIds: string[] = [];
      if (files.length > 0) {
        setUploadStatus(`Uploading ${files.length} attachment${files.length === 1 ? '' : 's'}...`);
        const formData = appendFilesToChatFormData(files, transcripts);

        const uploadResponse = await request(
          `/v1/support/tickets/${payload.ticket.id}/attachments`,
          {
            method: 'POST',
            body: formData
          },
          { retryOnUnauthorized: true }
        );
        const uploadPayload = (await uploadResponse.json()) as {
          attachments?: Array<{ id: string }>;
        };

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload attachments');
        }

        attachmentIds = (uploadPayload.attachments ?? []).map((attachment) => attachment.id);
      }

      const response = await request(
        `/v1/support/tickets/${payload.ticket.id}/messages`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(buildChatMessagePayload(text, attachmentIds, replyTo?.id))
        },
        { retryOnUnauthorized: true }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      reset({ text: '' });
      setFiles([]);
      setTranscripts({});
      setUploadStatus(null);
      setReplyTo(null);
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
      const response = await request(
        `/v1/support/messages/${messageId}/reaction`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({ emoji })
        },
        { retryOnUnauthorized: true }
      );

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

      <form className={styles.composer} onSubmit={handleFormSubmit(submitMessage)}>
        {replyTo ? (
          <div className={styles.replyComposer}>
            <span>Reply to {replyTo.sender_name}</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              ×
            </button>
          </div>
        ) : null}
        <div className={styles.composerBar}>
          <button className={styles.iconButton} type="button" aria-label="Emoji">
            ☺
          </button>
          <textarea
            id="withdraw-ticket-chat-input"
            className={styles.input}
            data-testid={WithdrawTicketChatTestId.INPUT}
            {...register('text')}
            placeholder="Write a message..."
            rows={1}
          />
          <label
            className={`${styles.iconButton} ${styles.fileButton}`}
            htmlFor="withdraw-ticket-chat-attachments"
            aria-label="Attach files"
          >
            📎
          </label>
          <input
            id="withdraw-ticket-chat-attachments"
            className={styles.fileInput}
            type="file"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <button
            className={styles.iconButton}
            type="button"
            aria-label={isRecordingAudio ? 'Stop audio recording' : 'Record audio'}
            onClick={() => (isRecordingAudio ? stopRecording() : void startRecording('audio'))}
          >
            🎙
          </button>
          <button
            className={styles.iconButton}
            type="button"
            aria-label={isRecordingVideo ? 'Stop video recording' : 'Record video circle'}
            onClick={() => (isRecordingVideo ? stopRecording() : void startRecording('video'))}
          >
            ◉
          </button>
          <button
            className={styles.sendButton}
            data-testid={WithdrawTicketChatTestId.SEND_BUTTON}
            type="submit"
            disabled={isSending || isSubmitting}
          >
            {isSending ? '...' : '➤'}
          </button>
        </div>
        <RecordingMediaPreview
          isRecordingAudio={isRecordingAudio}
          isRecordingVideo={isRecordingVideo}
          status={uploadStatus}
          videoStream={recordingVideoStream}
          onStop={stopRecording}
        />
        <SelectedAttachmentPreviews files={files} transcripts={transcripts} />
      </form>
    </section>
  );
}
