import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

// eslint-config-next 16 ships a native flat config, so it is spread directly
// rather than being bridged through FlatCompat.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // Allow the `const { x: _x, ...rest } = obj` omit idiom and deliberately
      // unused positional arguments.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Project-specific:
    'test-results/**',
    'playwright-report/**',
    'drizzle/**',
    // superpowers:using-git-worktrees creates linked worktrees here
    // (gitignored, but still on disk) — without ignoring it, linting from
    // the main checkout while a worktree exists also scans that worktree's
    // entire tree, including its own generated .next/** build output.
    '.worktrees/**',
  ]),
]);

export default eslintConfig;
