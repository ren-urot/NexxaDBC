import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // Playwright E2E specs live under tests/e2e and run via `npm run test:e2e`
    // (Playwright's own test runner), not Vitest — exclude them here so
    // Vitest's default *.spec.ts glob doesn't try to execute them too.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    // Multiple test files share the same live Postgres tables and each
    // truncates them in beforeEach; running files in parallel races that
    // cleanup across files. Serialize file execution to avoid it.
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
