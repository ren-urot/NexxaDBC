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
    // .worktrees is where superpowers:using-git-worktrees creates linked
    // worktrees (gitignored, but still on disk) — without excluding it,
    // running `npm test` from the main checkout while any worktree exists
    // rescans and double-runs that worktree's entire test suite too, and
    // picks up its tests/e2e/**/*.spec.ts as plain Vitest files (since that
    // exclude pattern isn't anchored to match the nested path), which then
    // fail outright since they use Playwright's API, not Vitest's.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', '.worktrees/**'],
    // Multiple test files share the same live Postgres tables and each
    // truncates them in beforeEach; running files in parallel races that
    // cleanup across files. Serialize file execution to avoid it.
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
