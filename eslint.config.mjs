import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';
import globalsPkg from 'globals';

const eslintConfig = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.wrangler/**',
      '*.tsbuildinfo',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    languageOptions: {
      globals: {
        ...globalsPkg.browser,
        ...globalsPkg.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // These files live outside the app's tsconfig (`src/**/*.ts(x)` +
  // vite.config.ts), so type-aware rules can't resolve a project for them.
  // Keep syntactic linting but drop the type-checked rule set.
  {
    files: [
      '*.config.{js,mjs,cjs,ts}',
      'scripts/**/*.mjs',
      'e2e/**/*.ts',
      'e2e/**/*.mjs',
    ],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettierConfig
);

export default eslintConfig;
