import { defineConfig } from 'vitest/config';
import '@vitest/coverage-v8';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000, // 15 seconds for streaming tests
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**/*.{ts,tsx}',
        'src/store/**/*.{ts,tsx}',
        'src/providers/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        '.next/',
        'dist/',
        '**/*.config.ts',
        '**/*.config.js',
        '**/*.d.ts',
        'vitest.setup.ts',
        'tests/e2e/**',
        'src/app/**',
        'src/trpc/**',
        'src/server/**',
        'src/docs/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../component-library/src'),
      '~': resolve(__dirname, './src'),
    },
  },
});
