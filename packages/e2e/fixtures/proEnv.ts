/**
 * Settings of the pro-mode suite, shared by playwright.config.ts and the
 * tests. Everything points at the Firebase emulators started by
 * `npm run test:pro` (firebase.json: Auth 9099, Firestore 8080) with the
 * demo-ensemble project, which needs no cloud project.
 */
export const PRO_APP_PORT = 3200;
export const PROJECT_ID = 'demo-ensemble';
export const AUTH_EMULATOR = '127.0.0.1:9099';
export const FIRESTORE_EMULATOR = '127.0.0.1:8080';

/** Test-only signing secret: the app verifies webhook events with it, tests sign with it. */
export const PRO_E2E_WEBHOOK_SECRET = 'whsec_e2e_pro_mode';

/**
 * The app server's environment: the Free build (no mock clients), sign-in
 * on the Auth emulator, credits in the Firestore emulator and Pro model
 * calls answered by the server's mock upstream (PRO_MOCK_UPSTREAM), so
 * nothing is spent. There is no Stripe key: tests stub the checkout
 * redirect and post signed webhook events themselves.
 */
export const PRO_APP_ENV: Record<string, string> = {
  NEXT_PUBLIC_MOCK_MODE: 'false',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR,
  FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR,
  FIRESTORE_EMULATOR_HOST: FIRESTORE_EMULATOR,
  FIREBASE_PROJECT_ID: PROJECT_ID,
  PRO_MOCK_UPSTREAM: 'true',
  PRO_RATE_LIMIT_RUNS: '1000',
  STRIPE_WEBHOOK_SECRET: PRO_E2E_WEBHOOK_SECRET,
  NEXT_DIST_DIR: '.next-e2e-pro',
};
