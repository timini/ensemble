import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Tag } from './Tag';

const meta = {
  title: 'UI/Tag',
  component: Tag,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success'],
      description: 'Tag color variant',
    },
    removable: {
      control: 'boolean',
      description: 'Show remove button',
    },
    selected: {
      control: 'boolean',
      description: 'Selected state',
    },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic states
export const Default: Story = {
  args: {
    children: 'Model Tag',
  },
};

export const Selected: Story = {
  args: {
    children: 'GPT-4',
    selected: true,
  },
};

export const Unselected: Story = {
  args: {
    children: 'Claude 3',
    selected: false,
  },
};

// Removable
export const Removable: Story = {
  args: {
    children: 'GPT-4o',
    removable: true,
    onRemove: action('removed'),
  },
};

export const RemovableSelected: Story = {
  args: {
    children: 'Claude Sonnet',
    removable: true,
    selected: true,
    onRemove: action('removed'),
  },
};

// Variants
export const Primary: Story = {
  args: {
    children: 'Primary Tag',
    variant: 'primary',
  },
};

export const Success: Story = {
  args: {
    children: 'Success Tag',
    variant: 'success',
  },
};

// Interactive
export const Clickable: Story = {
  args: {
    children: 'Click me',
    onClick: action('clicked'),
  },
};

export const ClickableSelected: Story = {
  args: {
    children: 'GPT-4 Turbo',
    selected: true,
    onClick: action('clicked'),
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    children: 'Disabled Tag',
    disabled: true,
  },
};

export const DisabledRemovable: Story = {
  args: {
    children: 'Disabled Tag',
    disabled: true,
    removable: true,
  },
};

// Model selection showcase
export const ModelSelection: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag selected onClick={action('clicked')}>GPT-4</Tag>
      <Tag selected onClick={action('clicked')}>Claude 3 Opus</Tag>
      <Tag onClick={action('clicked')}>GPT-4 Turbo</Tag>
      <Tag onClick={action('clicked')}>Claude 3 Sonnet</Tag>
      <Tag onClick={action('clicked')}>Gemini Pro</Tag>
      <Tag onClick={action('clicked')}>Grok</Tag>
    </div>
  ),
};

// Removable tags showcase
export const RemovableTags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag removable onRemove={action('removed GPT-4')}>GPT-4</Tag>
      <Tag removable onRemove={action('removed Claude')}>Claude 3 Opus</Tag>
      <Tag removable onRemove={action('removed Gemini')}>Gemini Pro</Tag>
    </div>
  ),
};
