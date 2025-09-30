import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { InlineAlert } from './InlineAlert';

const meta = {
  title: 'UI/InlineAlert',
  component: InlineAlert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
      description: 'Alert type and color',
    },
    dismissible: {
      control: 'boolean',
      description: 'Show dismiss button',
    },
  },
} satisfies Meta<typeof InlineAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

// Variants
export const Info: Story = {
  args: {
    variant: 'info',
    children: 'This is an informational message.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Your changes have been saved successfully.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Please review your API keys before proceeding.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'Invalid API key. Please check your configuration.',
  },
};

// Dismissible
export const InfoDismissible: Story = {
  args: {
    variant: 'info',
    dismissible: true,
    onDismiss: action('dismissed'),
    children: 'This message can be dismissed.',
  },
};

export const SuccessDismissible: Story = {
  args: {
    variant: 'success',
    dismissible: true,
    onDismiss: action('dismissed'),
    children: 'Configuration updated successfully.',
  },
};

export const WarningDismissible: Story = {
  args: {
    variant: 'warning',
    dismissible: true,
    onDismiss: action('dismissed'),
    children: 'Your trial period ends in 3 days.',
  },
};

export const ErrorDismissible: Story = {
  args: {
    variant: 'error',
    dismissible: true,
    onDismiss: action('dismissed'),
    children: 'Network error. Please try again.',
  },
};

// Long content
export const LongContent: Story = {
  args: {
    variant: 'info',
    children:
      'This is a longer informational message that demonstrates how the inline alert component handles multi-line content. It should wrap gracefully and maintain proper spacing and alignment with the icon.',
  },
};

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <InlineAlert variant="info">
        This is an informational message about the system.
      </InlineAlert>
      <InlineAlert variant="success">
        Your changes have been saved successfully.
      </InlineAlert>
      <InlineAlert variant="warning">
        Please verify your configuration before proceeding.
      </InlineAlert>
      <InlineAlert variant="error">
        An error occurred while processing your request.
      </InlineAlert>
      <InlineAlert variant="info" dismissible>
        This message can be dismissed by clicking the X button.
      </InlineAlert>
    </div>
  ),
};
