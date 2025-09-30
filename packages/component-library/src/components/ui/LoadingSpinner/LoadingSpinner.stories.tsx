import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';

const meta = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
      description: 'Spinner size',
    },
    variant: {
      control: 'select',
      options: ['default', 'primary', 'muted'],
      description: 'Spinner color variant',
    },
  },
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default
export const Default: Story = {
  args: {},
};

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

// Variants
export const Primary: Story = {
  args: {
    variant: 'primary',
  },
};

export const Muted: Story = {
  args: {
    variant: 'muted',
  },
};

// With label
export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col items-center space-y-4">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  ),
};

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center space-y-2">
          <LoadingSpinner size="sm" />
          <span className="text-xs text-muted-foreground">Small</span>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <LoadingSpinner />
          <span className="text-xs text-muted-foreground">Default</span>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <LoadingSpinner size="lg" />
          <span className="text-xs text-muted-foreground">Large</span>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center space-y-2">
          <LoadingSpinner variant="default" />
          <span className="text-xs text-muted-foreground">Default</span>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <LoadingSpinner variant="primary" />
          <span className="text-xs text-muted-foreground">Primary</span>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <LoadingSpinner variant="muted" />
          <span className="text-xs text-muted-foreground">Muted</span>
        </div>
      </div>
    </div>
  ),
};
