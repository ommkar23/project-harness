import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.next/**', 'dist/**', 'eslint.config.js', 'next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: [
      'src/**/*.ts',
      'lib/**/*.ts',
      'app/**/*.ts',
      'app/**/*.tsx',
      'test/**/*.ts',
      'test/**/*.tsx',
      'next.config.ts',
      'instrumentation.ts',
      'instrumentation.node.ts',
      'vitest.config.ts',
      'vitest.setup.ts',
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
);
