import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000, // 15 seconds for streaming tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'dist/',
        '**/*.config.ts',
        '**/*.config.js',
        'vitest.setup.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../component-library/src'),
      '~': resolve(__dirname, './src'),
    },
  },
});
