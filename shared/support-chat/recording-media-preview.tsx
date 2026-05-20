'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './recording-media-preview.module.css';

interface Props {
  isRecordingAudio: boolean;
  isRecordingVideo: boolean;
  status: string | null;
  videoStream: MediaStream | null;
  onStop: () => void;
}

const WAVE_BARS = Array.from({ length: 18 }, (_, index) => index);

function formatElapsedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function RecordingMediaPreview({
  isRecordingAudio,
  isRecordingVideo,
  status,
  videoStream,
  onStop
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const video = videoRef.current;

    if (video) {
      video.srcObject = videoStream;
    }

    if (video && videoStream) {
      const playPromise = video.play();

      if (playPromise) {
        void playPromise.catch(() => {});
      }
    }
  }, [videoStream]);

  useEffect(() => {
    if (!isRecordingVideo) {
      return;
    }

    recordingStartedAtRef.current = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRecordingVideo]);

  if (!isRecordingAudio && !isRecordingVideo && !status) {
    return null;
  }

  if (isRecordingVideo) {
    const overlay = (
      <div
        className={styles.videoOverlay}
        role="status"
        aria-label="Recording video fullscreen preview"
      >
        <div className={styles.videoOverlayHeader}>
          <span className={styles.recordingDot} aria-hidden="true" />
          <span className={styles.videoTimer}>{formatElapsedTime(elapsedSeconds)}</span>
        </div>
        <div className={styles.videoPreviewLarge} aria-label="Recording video circle preview">
          <video ref={videoRef} muted autoPlay playsInline />
        </div>
        <button
          className={styles.videoStopButton}
          type="button"
          aria-label="Stop video recording"
          onClick={onStop}
        >
          <span aria-hidden="true" />
          Остановить
        </button>
        <div className={styles.videoOverlayFooter}>
          <span className={styles.status}>{status}</span>
        </div>
      </div>
    );

    if (typeof document === 'undefined') {
      return overlay;
    }

    return createPortal(overlay, document.body);
  }

  return (
    <div className={styles.panel} role="status">
      <div className={styles.body}>
        {isRecordingAudio ? (
          <div className={styles.voicePreview} aria-label="Recording voice message preview">
            <span className={styles.voiceIcon}>●</span>
            <div className={styles.wave} aria-hidden="true">
              {WAVE_BARS.map((index) => (
                <span key={index} />
              ))}
            </div>
          </div>
        ) : null}
        {isRecordingVideo ? (
          <div className={styles.videoPreview} aria-label="Recording video circle preview">
            <video ref={videoRef} muted autoPlay playsInline />
          </div>
        ) : null}
        <span className={styles.status}>{status}</span>
      </div>
      {(isRecordingAudio || isRecordingVideo) && (
        <button className={styles.stopButton} type="button" onClick={onStop}>
          Stop
        </button>
      )}
    </div>
  );
}
