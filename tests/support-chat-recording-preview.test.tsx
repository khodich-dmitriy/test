import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RecordingMediaPreview } from '@/shared/support-chat/recording-media-preview';

describe('support chat recording preview', () => {
  it('shows video recording as a fullscreen circle with elapsed time', () => {
    render(
      <div data-testid="chat-shell">
        <RecordingMediaPreview
          isRecordingAudio={false}
          isRecordingVideo
          onStop={() => {}}
          status="Recording video circle..."
          videoStream={null}
        />
      </div>
    );

    const overlay = screen.getByLabelText('Recording video fullscreen preview');
    expect(overlay).toBeInTheDocument();
    expect(screen.getByTestId('chat-shell')).toBeEmptyDOMElement();
    expect(overlay.parentElement).toBe(document.body);
    expect(screen.getByLabelText('Recording video circle preview')).toBeInTheDocument();
    expect(screen.getByText('Подготавливаем камеру...')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});
