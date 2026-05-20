import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('withdraw ticket chat layout', () => {
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
});
