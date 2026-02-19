import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@ensemble-ai/consensus-core': resolve(__dirname, '../consensus-core/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
