const path = require('path');

/** @type {import('@storybook/react-vite').StorybookConfig} */
const config = {
  stories: [
    '../src/components/**/*.mdx',
    '../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {},
  async viteFinal(existingConfig) {
    if (existingConfig.resolve) {
      existingConfig.resolve.alias = {
        ...existingConfig.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
      };
    }
    return existingConfig;
  },
};

module.exports = config;
