'use client';

import { useEffect, useMemo } from 'react';

import styles from './selected-attachment-previews.module.css';

interface Props {
  files: File[];
  transcripts?: Record<string, string>;
}

const WAVE_BARS = Array.from({ length: 18 }, (_, index) => index);

function useObjectUrls(files: File[]) {
  const previewFiles = useMemo(
    () => files.filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/')),
    [files]
  );
  const urls = useMemo(() => {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return {};
    }

    return Object.fromEntries(
      previewFiles.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, URL.createObjectURL(file)])
    );
  }, [previewFiles]);

  useEffect(
    () => () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    },
    [urls]
  );

  return urls;
}

export function SelectedAttachmentPreviews({ files, transcripts = {} }: Props) {
  const urls = useObjectUrls(files);

  if (files.length === 0) {
    return null;
  }

  return (
    <ul className={styles.list}>
      {files.map((file) => {
        const objectUrl = urls[`${file.name}-${file.size}-${file.lastModified}`] ?? '';

        return (
          <li key={`${file.name}-${file.size}-${file.lastModified}`} className={styles.item}>
            {file.type.startsWith('audio/') ? (
              <div className={styles.voicePreview} aria-label={`Voice message preview ${file.name}`}>
                <span className={styles.voiceIcon}>▶</span>
                <div className={styles.wave} aria-hidden="true">
                  {WAVE_BARS.map((index) => (
                    <span key={index} />
                  ))}
                </div>
              </div>
            ) : file.type.startsWith('video/') ? (
              <div className={styles.videoPreview} aria-label={`Video circle preview ${file.name}`}>
                {objectUrl ? <video src={objectUrl} muted playsInline preload="metadata" /> : null}
                <span>▶</span>
              </div>
            ) : file.type.startsWith('image/') && objectUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.imagePreview} src={objectUrl} alt={file.name} />
            ) : null}
            <span className={styles.name}>{file.name}</span>
            {transcripts[file.name] ? (
              <span className={styles.transcript}>{transcripts[file.name]}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
