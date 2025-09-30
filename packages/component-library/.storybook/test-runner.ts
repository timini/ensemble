import type { TestRunnerConfig } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  // Hook that runs before each test
  async preVisit(page) {
    // You can add custom logic here, e.g., authentication
  },

  // Hook that runs after each test
  async postVisit(page, context) {
    // The test-runner will automatically:
    // 1. Check for accessibility violations (if @storybook/addon-a11y is installed)
    // 2. Take visual snapshots
    // 3. Run interaction tests defined in play functions
  },
};

export default config;
