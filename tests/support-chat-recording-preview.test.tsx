import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RecordingMediaPreview } from '@/shared/support-chat/recording-media-preview';

describe('support chat recording preview', () => {
  it('shows video recording as a fullscreen circle with elapsed time', () => {
    render(
      <RecordingMediaPreview
        isRecordingAudio={false}
        isRecordingVideo
        onStop={() => {}}
        status="Recording video circle..."
        videoStream={null}
      />
    );

    expect(screen.getByLabelText('Recording video fullscreen preview')).toBeInTheDocument();
    expect(screen.getByLabelText('Recording video circle preview')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});
