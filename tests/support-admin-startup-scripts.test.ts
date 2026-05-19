import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { scripts: Record<string, string> };

describe('support admin startup scripts', () => {
  it('defines dedicated support-admin scripts and wrapper commands', async () => {
    expect(packageJson.scripts['dev:support-admin']).toBe(
      'node scripts/run-support-admin-with-port-cleanup.mjs dev'
    );
    expect(packageJson.scripts['start:support-admin']).toBe(
      'node scripts/run-support-admin-with-port-cleanup.mjs start'
    );
    expect(packageJson.scripts['build:support-admin']).toBe('next build ./support-admin');

    const startupScript = await import('../scripts/run-support-admin-with-port-cleanup.mjs');
    expect(startupScript.createSupportAdminNextCommand('dev')).toEqual([
      'next',
      'dev',
      './support-admin',
      '-p',
      '3001'
    ]);
    expect(startupScript.createSupportAdminNextCommand('start')).toEqual([
      'next',
      'start',
      './support-admin',
      '-p',
      '3001'
    ]);
  });
});

