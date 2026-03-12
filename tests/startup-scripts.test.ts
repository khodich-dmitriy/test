import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { scripts: Record<string, string> };

describe('startup scripts', () => {
  it('routes dev and start through the port-cleanup wrapper', async () => {
    expect(packageJson.scripts.dev).toBe('node scripts/run-next-with-port-cleanup.mjs dev');
    expect(packageJson.scripts.start).toBe('node scripts/run-next-with-port-cleanup.mjs start');

    const startupScript = await import('../scripts/run-next-with-port-cleanup.mjs');
    expect(startupScript.createNextCommand('dev')).toEqual(['next', 'dev']);
    expect(startupScript.createNextCommand('start')).toEqual(['next', 'start']);
  });
});
