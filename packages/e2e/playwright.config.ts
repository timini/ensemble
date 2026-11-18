import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { PRO_APP_ENV, PRO_APP_PORT } from './fixtures/proEnv';

// Load environment variables from .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

/**
 * Playwright configuration for E2E testing
 *
 * Test suites:
 * - mock-mode: Tests with mock API clients (runs in CI before deployment)
 * - local-endpoint: Free mode against a fake OpenAI-compatible server (runs
 *   with mock-mode in `npm run test:mock`; no keys, no paid calls)
 * - free-mode: Tests with real API keys (runs post-deployment against deployed infra)
 * - pro-mode: Pro mode against the Firebase Auth and Firestore emulators,
 *   with the mock model upstream and signed Stripe test events. Run it
 *   with `npm run test:pro`, which starts the emulators around it.
 *
 * Usage:
 *   npm run test:mock                   # Run mock-mode tests (default, local server)
 *   npm run test:free                   # Run free-mode tests (requires API keys)
 *   npx playwright test --project=all   # Run all available tests
 *
 * Environment variables:
 * - E2E_MODE: 'mock' (default), 'free' or 'pro' - determines which servers to start
 * - E2E_BASE_URL: Optional URL of deployed app (e.g., https://example.com)
 *   When set, tests run against this URL instead of starting a local server.
 *   Used for post-deployment testing in CI.
 *
 * CI/CD Flow:
 * 1. Mock mode E2E tests run locally (webServer starts) as part of CI checks
 * 2. If CI passes, app deploys to Firebase App Hosting
 * 3. Free/Pro mode E2E tests run against deployed URL (E2E_BASE_URL is set)
 */

// Determine which mode to run based on E2E_MODE env var
const e2eMode = process.env.E2E_MODE || 'mock';
const isMockMode = e2eMode === 'mock';

// Support testing against deployed infrastructure via E2E_BASE_URL
// When set, tests run against the deployed URL instead of starting a local server
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const isDeployedTest = !!process.env.E2E_BASE_URL;

/**
 * Local endpoint suite: a second app server in Free mode (no mock clients)
 * and a fake OpenAI-compatible server standing in for Ollama. Runs with the
 * mock suite, needs no keys and makes no paid calls.
 */
const LOCAL_ENDPOINT_APP_PORT = 3100;
const FAKE_OPENAI_PORT = 11499;
const runLocalEndpointServers = isMockMode && !isDeployedTest;

/** Pro suite: see fixtures/proEnv.ts. */
const isProMode = e2eMode === 'pro';

/**
 * Browser storage with the first-run onboarding sheet already finished, so
 * suites that are not about onboarding start on the plain workspace.
 * tests/mock-mode/onboarding.spec.ts starts from empty storage instead.
 */
function onboardingDone(origin: string) {
  return {
    cookies: [],
    origins: [{ origin, localStorage: [{ name: 'ensemble-ai-store', value: JSON.stringify({ onboardingDone: true }) }] }],
  };
}

type WebServer = Extract<NonNullable<PlaywrightTestConfig['webServer']>, unknown[]>[number];

const proServers: WebServer[] = [
  {
    command: `cd ../app && npx next dev --turbo -p ${PRO_APP_PORT}`,
    url: `http://localhost:${PRO_APP_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    env: PRO_APP_ENV,
  },
];

const mockOrFreeServers: WebServer[] = [
  {
    command: isMockMode ? 'cd ../app && npm run dev:mock' : 'cd ../app && npm run dev:free',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NEXT_PUBLIC_MOCK_MODE: isMockMode ? 'true' : 'false',
    },
  },
  ...(runLocalEndpointServers
    ? [
        {
          command: 'node fixtures/fake-openai-server.mjs',
          url: `http://localhost:${FAKE_OPENAI_PORT}/`,
          reuseExistingServer: !process.env.CI,
          timeout: 30 * 1000,
          env: { FAKE_OPENAI_PORT: String(FAKE_OPENAI_PORT) },
        },
        {
          // Own build directory so it can run next to the mock server.
          // NEXT_PUBLIC_OLLAMA_URL points Ollama detection at the fake server.
          command: `cd ../app && npx cross-env NEXT_PUBLIC_MOCK_MODE=false NEXT_PUBLIC_OLLAMA_URL=http://localhost:${FAKE_OPENAI_PORT} NEXT_DIST_DIR=.next-e2e-free next dev --turbo -p ${LOCAL_ENDPOINT_APP_PORT}`,
          url: `http://localhost:${LOCAL_ENDPOINT_APP_PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 180 * 1000,
          env: {
            NEXT_PUBLIC_MOCK_MODE: 'false',
            NEXT_PUBLIC_OLLAMA_URL: `http://localhost:${FAKE_OPENAI_PORT}`,
          },
        },
      ]
    : []),
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'dot' : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Mock Mode: Default test suite using mock API clients
    // Always runs in CI, uses NEXT_PUBLIC_MOCK_MODE=true
    {
      name: 'mock-mode',
      testDir: './tests/mock-mode',
      use: { ...devices['Desktop Chrome'], storageState: onboardingDone(new URL(baseURL).origin) },
    },

    // Free Mode: Tests with real API keys
    // Only runs when TEST_OPENAI_API_KEY and TEST_ANTHROPIC_API_KEY are set
    // Skips automatically if keys are not available
    // Sequential execution: real API keys are shared across tests so parallel
    // runs cause rate-limiting and intermittent provider errors
    {
      name: 'free-mode',
      testDir: './tests/free-mode',
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'] },
    },

    // Local endpoint: Free mode against the fake OpenAI-compatible server
    // (fixtures/fake-openai-server.mjs). Real provider code, no cloud keys.
    {
      name: 'local-endpoint',
      testDir: './tests/local-endpoint',
      fullyParallel: false,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${LOCAL_ENDPOINT_APP_PORT}`,
        storageState: onboardingDone(`http://localhost:${LOCAL_ENDPOINT_APP_PORT}`),
      },
    },

    // Pro Mode: sign-in, credits, Stripe webhooks and billed runs against
    // the Firebase emulators. Tests share the emulators, so they run in order.
    {
      name: 'pro-mode',
      testDir: './tests/pro-mode',
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PRO_APP_PORT}` },
    },
  ],

  // Web server configuration
  // Only start a local server if E2E_BASE_URL is not set (i.e., not testing deployed infra)
  // Mode is determined by E2E_MODE environment variable
  ...(isDeployedTest
    ? {}
    : {
        webServer: isProMode ? proServers : mockOrFreeServers,
      }),
});
