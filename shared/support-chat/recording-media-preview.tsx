'use client';

import { useEffect, useRef } from 'react';

import styles from './recording-media-preview.module.css';

interface Props {
  isRecordingAudio: boolean;
  isRecordingVideo: boolean;
  status: string | null;
  videoStream: MediaStream | null;
  onStop: () => void;
}

const WAVE_BARS = Array.from({ length: 18 }, (_, index) => index);

export function RecordingMediaPreview({
  isRecordingAudio,
  isRecordingVideo,
  status,
  videoStream,
  onStop
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  if (!isRecordingAudio && !isRecordingVideo && !status) {
    return null;
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
