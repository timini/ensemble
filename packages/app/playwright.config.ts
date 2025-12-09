import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 *
 * Three test suites:
 * - mock-mode: Tests with mock API clients (default, always runs in CI)
 * - free-mode: Tests with real API keys (runs when TEST_*_API_KEY env vars are set)
 * - pro-mode: Placeholder for Phase 4 backend tests
 *
 * Usage:
 *   npm run test:e2e                    # Run mock-mode tests (default)
 *   npm run test:e2e:free               # Run free-mode tests (requires API keys)
 *   npx playwright test --project=all   # Run all available tests
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'dot' : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Mock Mode: Default test suite using mock API clients
    // Always runs in CI, uses NEXT_PUBLIC_MOCK_MODE=true
    {
      name: 'mock-mode',
      testDir: './tests/e2e/mock-mode',
      use: { ...devices['Desktop Chrome'] },
    },

    // Free Mode: Tests with real API keys
    // Only runs when TEST_OPENAI_API_KEY and TEST_ANTHROPIC_API_KEY are set
    // Skips automatically if keys are not available
    {
      name: 'free-mode',
      testDir: './tests/e2e/free-mode',
      use: { ...devices['Desktop Chrome'] },
    },

    // Pro Mode: Placeholder for Phase 4 backend tests
    // Will test authentication, credits, and backend-proxied API calls
    {
      name: 'pro-mode',
      testDir: './tests/e2e/pro-mode',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration
  // Mock mode server for mock-mode tests
  webServer: {
    command: 'npm run dev:mock',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NEXT_PUBLIC_MOCK_MODE: 'true',
    },
  },
});
