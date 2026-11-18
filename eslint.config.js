import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Enforces section 8 of docs/ai/00-plan.md: `new Date("2013-01-01")` parses as
 * UTC midnight and renders as the previous day in any negative-offset
 * timezone. Only src/shared/utils/date.ts may touch Date directly.
 */
const noRawDates = [
  'error',
  {
    selector: 'NewExpression[callee.name="Date"]',
    message:
      'Do not construct Date directly: ISO date strings parse as UTC and shift a day. Use the helpers in ~/shared/utils/date.',
  },
  {
    selector: 'CallExpression[callee.object.name="Date"][callee.property.name="parse"]',
    message: 'Date.parse has the same UTC pitfall. Use ~/shared/utils/date.',
  },
];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'src/types/api.d.ts'] },
  js.configs.recommended,

  // Type-aware linting applies to TypeScript sources only. Applying it to
  // eslint.config.js itself fails, because that file is in no tsconfig.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-syntax': noRawDates,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
    },
  },

  // The single module permitted to use the Date API.
  { files: ['src/shared/utils/date.ts'], rules: { 'no-restricted-syntax': 'off' } },

  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  // Plain JS config files get untyped linting only.
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
);
