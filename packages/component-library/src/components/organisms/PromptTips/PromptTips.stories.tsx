/**
 * PromptTips Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { PromptTips } from './PromptTips';

const meta = {
  title: 'Organisms/PromptTips',
  component: PromptTips,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PromptTips>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default PromptTips display with all tips visible
 */
export const Default: Story = {
  args: {},
};

/**
 * PromptTips in dark mode
 */
export const DarkMode: Story = {
  args: {},
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <Story />
      </div>
    ),
  ],
};

/**
 * PromptTips with custom className
 */
export const WithCustomClass: Story = {
  args: {
    className: 'shadow-lg',
  },
};
