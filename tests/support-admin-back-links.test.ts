import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const backLinkStylePaths = [
  'support-admin/src/views/ticket-chat/ui/ticket-chat-page.module.css',
  'support-admin/src/views/user-details/ui/user-details-page.module.css',
  'support-admin/src/views/staff/ui/staff-page.module.css'
];

function readStyle(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('support-admin back links', () => {
  it('keeps back buttons sized to their label instead of stretching in grid layouts', () => {
    for (const stylePath of backLinkStylePaths) {
      const style = readStyle(stylePath);

      expect(style).toContain('align-self: start;');
      expect(style).toContain('justify-self: start;');
      expect(style).toContain('inline-size: fit-content;');
      expect(style).toContain('width: fit-content;');
      expect(style).toContain('white-space: nowrap;');
    }
  });
});
