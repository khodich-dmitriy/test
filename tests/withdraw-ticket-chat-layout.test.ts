import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('withdraw ticket chat layout', () => {
  it('keeps bottom video controls above the shell footer fade zone', () => {
    const css = readFileSync(
      path.join(process.cwd(), 'src/features/support/chat/ui/withdraw-ticket-chat.module.css'),
      'utf8'
    );

    expect(css).toContain('padding-bottom: 132px;');
  });
});
