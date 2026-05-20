'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

import {
  appendFilesToChatFormData,
  buildChatMessagePayload
} from '../../../../../../shared/support-chat/chat-core';
import { RecordingMediaPreview } from '../../../../../../shared/support-chat/recording-media-preview';
import { SelectedAttachmentPreviews } from '../../../../../../shared/support-chat/selected-attachment-previews';
import type { SupportMessage } from '../../../../entities/support/model/types';
import styles from './send-message-form.module.css';

interface Props {
  ticketId: string;
  replyTo?: SupportMessage | null;
  onCancelReply?: () => void;
  onSent: (message: SupportMessage) => void;
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

export function SendMessageForm({ ticketId, replyTo = null, onCancelReply, onSent }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingVideoStream, setRecordingVideoStream] = useState<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);
  const {
    handleSubmit,
    register,
    reset,
    watch,
    formState: { isSubmitting }
  } = useForm<ChatFormValues>({
    resolver: yupResolver(chatFormSchema),
    defaultValues: { text: '' },
    mode: 'onChange'
  });
  const text = watch('text');
  const isSubmitDisabled = loading || isSubmitting || (text.trim().length === 0 && files.length === 0);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      recorderRef.current?.stop();
      recordingVideoStream?.getTracks().forEach((track) => track.stop());
    },
    [recordingVideoStream]
  );

  async function startRecording(kind: 'audio' | 'video') {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser.');
      return;
    }

    const fileName = `${kind}-${Date.now()}.webm`;
    const chunks: Blob[] = [];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: kind === 'video'
    });
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (recordEvent) => {
      if (recordEvent.data.size > 0) {
        chunks.push(recordEvent.data);
      }
    };
    recorder.onstop = () => {
      setUploadStatus(`${kind === 'video' ? 'Video circle' : 'Voice message'} is ready to send`);
      setFiles((current) => [
        ...current,
        new File(chunks, fileName, { type: kind === 'video' ? 'video/webm' : 'audio/webm' })
      ]);
      stream.getTracks().forEach((track) => track.stop());
    };

    if (kind === 'audio') {
      const mediaWindow = window as MediaWindow;
      const Recognition = mediaWindow.SpeechRecognition ?? mediaWindow.webkitSpeechRecognition;
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'ru-RU';
        recognition.onresult = (speechEvent) => {
          const transcript = Array.from(speechEvent.results)
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
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecordingAudio(false);
    setIsRecordingVideo(false);
    setRecordingVideoStream(null);
  }

  async function onSubmit(values: ChatFormValues) {
    const trimmedText = values.text.trim();
    if (trimmedText.length === 0 && files.length === 0) {
      setError('Message or attachment is required');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let attachmentIds: string[] = [];
      if (files.length > 0) {
        setUploadStatus(`Uploading ${files.length} attachment${files.length === 1 ? '' : 's'}...`);
        const formData = appendFilesToChatFormData(files, transcripts);

        const uploadResponse = await fetch(`/v1/support/tickets/${ticketId}/attachments`, {
          method: 'POST',
          body: formData
        });
        const uploadPayload = (await uploadResponse.json()) as {
          message?: string;
          attachments?: Array<{ id: string }>;
        };
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload.message || 'Failed to upload attachments');
        }

        attachmentIds = (uploadPayload.attachments ?? []).map((attachment) => attachment.id);
      }

      const response = await fetch(`/v1/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildChatMessagePayload(trimmedText, attachmentIds, replyTo?.id))
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || 'Failed to send message');
      }

      const message = (await response.json()) as SupportMessage;
      setUploadStatus(null);
      reset({ text: '' });
      setFiles([]);
      setTranscripts({});
      onCancelReply?.();
      onSent(message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      {replyTo ? (
        <div className={styles.replyComposer}>
          <span>Reply to {replyTo.sender_name}</span>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply">
            ×
          </button>
        </div>
      ) : null}
      <div className={styles.composerBar}>
        <button className={styles.iconButton} type="button" aria-label="Emoji">
          ☺
        </button>
        <textarea
          id={`support-message-${ticketId}`}
          className={styles.textarea}
          {...register('text', {
            onChange: () => {
              if (error) {
                setError(null);
              }
            }
          })}
          rows={1}
          placeholder="Type support reply..."
        />
        <label
          className={`${styles.iconButton} ${styles.fileButton}`}
          htmlFor={`support-attachments-${ticketId}`}
          aria-label="Attach files"
        >
          📎
        </label>
        <input
          id={`support-attachments-${ticketId}`}
          className={styles.fileInput}
          type="file"
          multiple
          onChange={(event) => {
            setFiles(Array.from(event.target.files ?? []));
            if (error) {
              setError(null);
            }
          }}
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
        <button className={styles.button} type="submit" disabled={isSubmitDisabled} aria-label="Send">
          {loading ? '...' : '➤'}
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
      {error && (
        <p className={styles.error} role="status">
          {error}
        </p>
      )}
    </form>
  );
}
