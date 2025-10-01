import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const meta = {
  title: 'Atoms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the textarea is disabled',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: 'This is pre-filled text in the textarea.',
  },
};

export const CustomHeight: Story = {
  args: {
    placeholder: 'Custom height...',
    className: 'min-h-[200px]',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-full max-w-sm">
      <label htmlFor="message" className="block text-sm font-medium mb-2">
        Message
      </label>
      <Textarea id="message" placeholder="Type your message here..." />
    </div>
  ),
};
