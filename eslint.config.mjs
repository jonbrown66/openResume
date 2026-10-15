import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['next-env.d.ts', '.next/**', '.next-dev/**', 'node_modules/**', 'promo-video/**', 'output/**', 'tmp/**', 'test-results/**', 'playwright-report/**'] },
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx}'], rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
  } },
);

