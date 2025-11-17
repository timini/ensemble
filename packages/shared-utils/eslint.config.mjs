import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const tsConfigs = [...tseslint.configs.recommended, ...tseslint.configs.stylistic];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [eslint.configs.recommended],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: tsConfigs,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
