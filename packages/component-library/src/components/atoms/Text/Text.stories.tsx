import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './Text';

const meta = {
  title: 'Atoms/Text',
  component: Text,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['body', 'helper', 'caption', 'small'],
      description: 'Text style variant',
    },
    color: {
      control: 'select',
      options: ['default', 'muted', 'error', 'success', 'warning', 'primary'],
      description: 'Text color',
    },
    as: {
      control: 'select',
      options: ['p', 'span'],
      description: 'HTML element to render',
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default (body) variant
export const Default: Story = {
  args: {
    children: 'This is default body text with base size and gray-900 color.',
  },
};

// Variants
export const Helper: Story = {
  args: {
    variant: 'helper',
    children: 'This is helper text, smaller and slightly muted for supporting information.',
  },
};

export const Caption: Story = {
  args: {
    variant: 'caption',
    children: 'This is caption text, extra small for image captions or fine print.',
  },
};

export const Small: Story = {
  args: {
    variant: 'small',
    children: 'This is small text, similar to helper but with default gray-900 color.',
  },
};

// Colors
export const Muted: Story = {
  args: {
    color: 'muted',
    children: 'This is muted text for less emphasis.',
  },
};

export const Error: Story = {
  args: {
    color: 'error',
    children: 'This is error text for validation messages.',
  },
};

export const Success: Story = {
  args: {
    color: 'success',
    children: 'This is success text for positive feedback.',
  },
};

export const Warning: Story = {
  args: {
    color: 'warning',
    children: 'This is warning text for cautionary messages.',
  },
};

export const Primary: Story = {
  args: {
    color: 'primary',
    children: 'This is primary colored text for emphasis.',
  },
};

// Combinations
export const HelperError: Story = {
  args: {
    variant: 'helper',
    color: 'error',
    children: 'This field is required.',
  },
};

export const HelperSuccess: Story = {
  args: {
    variant: 'helper',
    color: 'success',
    children: 'Your password is strong.',
  },
};

export const CaptionMuted: Story = {
  args: {
    variant: 'caption',
    color: 'muted',
    children: 'Photo by John Doe, 2024',
  },
};

// As span
export const AsSpan: Story = {
  args: {
    as: 'span',
    children: 'This text renders as a span element instead of paragraph.',
  },
};

// All variants showcase
export const AllVariants: Story = {
  args: { children: '' },
  render: () => (
    <div className="space-y-4 max-w-lg">
      <div>
        <Text variant="body">Body: Default body text for main content.</Text>
      </div>
      <div>
        <Text variant="helper">Helper: Supporting text for forms and descriptions.</Text>
      </div>
      <div>
        <Text variant="caption">Caption: Small text for captions and fine print.</Text>
      </div>
      <div>
        <Text variant="small">Small: Compact text for tight spaces.</Text>
      </div>
    </div>
  ),
};

// All colors showcase
export const AllColors: Story = {
  args: { children: '' },
  render: () => (
    <div className="space-y-2 max-w-lg">
      <Text color="default">Default: Standard text color</Text>
      <Text color="muted">Muted: Less prominent text</Text>
      <Text color="primary">Primary: Brand color emphasis</Text>
      <Text color="success">Success: Positive feedback</Text>
      <Text color="warning">Warning: Cautionary message</Text>
      <Text color="error">Error: Error or validation message</Text>
    </div>
  ),
};

// Form helper text example
export const FormHelperText: Story = {
  args: { children: '' },
  render: () => (
    <div className="space-y-2 max-w-md">
      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
        Email
      </label>
      <input
        type="email"
        id="email"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border"
        placeholder="you@example.com"
      />
      <Text variant="helper" color="muted">
        We'll never share your email with anyone else.
      </Text>
    </div>
  ),
};

// Error message example
export const ErrorMessage: Story = {
  args: { children: '' },
  render: () => (
    <div className="space-y-2 max-w-md">
      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
        Password
      </label>
      <input
        type="password"
        id="password"
        className="mt-1 block w-full rounded-md border-red-300 shadow-sm px-3 py-2 border"
      />
      <Text variant="helper" color="error">
        Password must be at least 8 characters long.
      </Text>
    </div>
  ),
};
