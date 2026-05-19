'use client';

import { useState } from 'react';

import styles from './send-message-form.module.css';

interface Props {
  ticketId: string;
  onSent: () => void;
}

export function SendMessageForm({ ticketId, onSent }: Props) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSubmitDisabled = loading || (text.trim().length === 0 && files.length === 0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText.length === 0 && files.length === 0) {
      setError('Message or attachment is required');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let attachmentIds: string[] = [];
      if (files.length > 0) {
        const formData = new FormData();
        for (const file of files) {
          formData.append('files', file);
        }

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
        body: JSON.stringify(
          attachmentIds.length > 0
            ? { text: trimmedText, attachment_ids: attachmentIds }
            : { text: trimmedText }
        )
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || 'Failed to send message');
      }

      setText('');
      setFiles([]);
      onSent();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`support-message-${ticketId}`}>
          Your reply
        </label>
        <textarea
          id={`support-message-${ticketId}`}
          className={styles.textarea}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          rows={4}
          placeholder="Type support reply..."
        />
      </div>
      <div className={styles.attachments}>
        <label className={styles.fileButton} htmlFor={`support-attachments-${ticketId}`}>
          Attach files
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
        {files.length > 0 ? (
          <ul className={styles.attachmentList}>
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>{file.name}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className={styles.footer}>
        {error && (
          <p className={styles.error} role="status">
            {error}
          </p>
        )}
        <button className={styles.button} type="submit" disabled={isSubmitDisabled}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
}
