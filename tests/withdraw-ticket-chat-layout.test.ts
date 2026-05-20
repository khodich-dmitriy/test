import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('withdraw ticket chat layout', () => {
  it('mounts the chat client-only on the withdrawal details page', () => {
    const detailsPage = readFileSync(
      path.join(process.cwd(), 'src/views/withdraw-details/ui/withdraw-details-page.tsx'),
      'utf8'
    );

    expect(detailsPage).toContain("import('@/src/features/support/chat/ui/withdraw-ticket-chat')");
    expect(detailsPage).toContain('ssr: false');
  });

  it('keeps bottom video controls above the shell footer fade zone', () => {
    const clientCss = readFileSync(
      path.join(process.cwd(), 'src/features/support/chat/ui/withdraw-ticket-chat.module.css'),
      'utf8'
    );
    const timelineCss = readFileSync(
      path.join(process.cwd(), 'shared/support-chat/support-chat-timeline.module.css'),
      'utf8'
    );

    expect(clientCss).toContain('--chat-bottom-safe-area: 132px;');
    expect(timelineCss).toContain('padding-block-end: var(--chat-bottom-safe-area, 14px);');
    expect(timelineCss).toContain('scroll-padding-bottom: var(--chat-bottom-safe-area, 14px);');
    expect(timelineCss).toContain(".videoPlayButton[data-state='playing']");
    expect(timelineCss).toContain('background: rgba(15, 23, 42, 0.72);');
  });

  it('uses the current viewer role to align own messages on the left', () => {
    const clientCss = readFileSync(
      path.join(process.cwd(), 'src/features/support/chat/ui/withdraw-ticket-chat.module.css'),
      'utf8'
    );
    const clientChat = readFileSync(
      path.join(process.cwd(), 'src/features/support/chat/ui/withdraw-ticket-chat.tsx'),
      'utf8'
    );
    const adminChat = readFileSync(
      path.join(process.cwd(), 'support-admin/src/views/ticket-chat/ui/ticket-chat-page.tsx'),
      'utf8'
    );
    const timelineCss = readFileSync(
      path.join(process.cwd(), 'shared/support-chat/support-chat-timeline.module.css'),
      'utf8'
    );

    expect(clientChat).toContain('currentRole="user"');
    expect(adminChat).toContain('currentRole="support"');
    expect(timelineCss).toContain(".message[data-author='own']");
    expect(timelineCss).toContain(".message[data-author='other']");
    expect(timelineCss).toContain('justify-self: start;');
    expect(timelineCss).toContain('justify-self: end;');
    expect(clientCss).not.toContain('--chat-user-align');
  });

  it('keeps the recording video preparation surface light instead of dark', () => {
    const recordingCss = readFileSync(
      path.join(process.cwd(), 'shared/support-chat/recording-media-preview.module.css'),
      'utf8'
    );

    expect(recordingCss).toContain('background: #e8eef7;');
    expect(recordingCss).toContain('linear-gradient(145deg, #f8fbff, #e8eef7 54%, #d8e3f1)');
    expect(recordingCss).not.toContain('background: #020617;');
  });
});
