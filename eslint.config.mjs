import js from '@eslint/js';
import tsPlugin from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tsPlugin.config(
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/next-env.d.ts'],
  },
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }
);
