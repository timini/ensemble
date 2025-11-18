import { defineConfig } from 'vitest/config';
import '@vitest/coverage-v8';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/providers/**/*.{ts,js}',
        'src/similarity/**/*.{ts,js}',
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.config.ts',
        'src/providers/__tests__/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
