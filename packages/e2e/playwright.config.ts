import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

/**
 * Playwright configuration for E2E testing
 *
 * Three test suites:
 * - mock-mode: Tests with mock API clients (runs in CI before deployment)
 * - free-mode: Tests with real API keys (runs post-deployment against deployed infra)
 * - pro-mode: Placeholder for Phase 4 backend tests
 *
 * Usage:
 *   npm run test:mock                   # Run mock-mode tests (default, local server)
 *   npm run test:free                   # Run free-mode tests (requires API keys)
 *   npx playwright test --project=all   # Run all available tests
 *
 * Environment variables:
 * - E2E_MODE: 'mock' (default) or 'free' - determines which API mode to use
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
      use: { ...devices['Desktop Chrome'] },
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

    // Pro Mode: Placeholder for Phase 4 backend tests
    // Will test authentication, credits, and backend-proxied API calls
    {
      name: 'pro-mode',
      testDir: './tests/pro-mode',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration
  // Only start a local server if E2E_BASE_URL is not set (i.e., not testing deployed infra)
  // Mode is determined by E2E_MODE environment variable
  ...(isDeployedTest
    ? {}
    : {
        webServer: {
          command: isMockMode
            ? 'cd ../app && npm run dev:mock'
            : 'cd ../app && npm run dev:free',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
          env: {
            NEXT_PUBLIC_MOCK_MODE: isMockMode ? 'true' : 'false',
          },
        },
      }),
});
