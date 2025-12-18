/**
 * PromptInputWithHint Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { PromptInputWithHint } from './PromptInputWithHint';

const meta = {
  title: 'Organisms/PromptInputWithHint',
  component: PromptInputWithHint,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PromptInputWithHint>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default PromptInputWithHint with empty value
 */
export const Default: Story = {
  args: { value: '', onChange: () => {} },
  render: function DefaultStory() {
    const [value, setValue] = useState('');
    return (
      <PromptInputWithHint
        value={value}
        onChange={setValue}
      />
    );
  },
};

/**
 * PromptInputWithHint with pre-filled value
 */
export const WithValue: Story = {
  args: { value: '', onChange: () => {} },
  render: function WithValueStory() {
    const [value, setValue] = useState('What are the key differences between React and Vue?');
    return (
      <PromptInputWithHint
        value={value}
        onChange={setValue}
      />
    );
  },
};

/**
 * PromptInputWithHint with custom placeholder
 */
export const CustomPlaceholder: Story = {
  args: { value: '', onChange: () => {} },
  render: function CustomPlaceholderStory() {
    const [value, setValue] = useState('');
    return (
      <PromptInputWithHint
        value={value}
        onChange={setValue}
        placeholder="Ask me anything..."
      />
    );
  },
};

/**
 * PromptInputWithHint in dark mode
 */
export const DarkMode: Story = {
  args: { value: '', onChange: () => {} },
  render: function DarkModeStory() {
    const [value, setValue] = useState('');
    return (
      <PromptInputWithHint
        value={value}
        onChange={setValue}
      />
    );
  },
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
