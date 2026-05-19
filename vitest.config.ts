import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['e2e/**']
  },
  esbuild: {
    jsx: 'automatic'
  },
  resolve: {
    alias: {
      '@/app': path.resolve(__dirname, 'withdraw-app/app'),
      '@/middleware': path.resolve(__dirname, 'withdraw-app/middleware.ts'),
      '@': path.resolve(__dirname, '.')
    }
  }
});
