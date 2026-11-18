import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Tests that need the Firebase emulators (Firestore rules, credit ledger
 * transactions, the Stripe webhook against Firestore). Run them through
 * `npm run test:emulator`, which starts the Auth and Firestore emulators
 * with the demo-ensemble project and stops them afterwards.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.emulator.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    // One Firestore emulator is shared, so files run one at a time.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      '@ensemble-ai/shared-utils': resolve(__dirname, '../shared-utils/src/index.ts'),
      'server-only': resolve(__dirname, './src/server/testing/serverOnlyStub.ts'),
    },
  },
});
