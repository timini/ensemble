import type { Meta, StoryObj } from '@storybook/react';
import { ModeSelectionCard } from './ModeSelectionCard';

const meta = {
  title: 'Molecules/ModeSelectionCard',
  component: ModeSelectionCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'User-selectable mode cards for Free and Pro modes. Mock mode for testing/development is controlled via environment variable (NEXT_PUBLIC_MOCK_MODE) and is not user-selectable.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'select',
      options: ['free', 'pro'],
      description: 'The mode type (free or pro)',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the mode is currently selected',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the mode is disabled',
    },
  },
} satisfies Meta<typeof ModeSelectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Free mode - uses a single selected AI provider with your API key.
 */
export const FreeUnselected: Story = {
  args: {
    mode: 'free',
    selected: false,
    disabled: false,
  },
};

/**
 * Free mode in selected state.
 */
export const FreeSelected: Story = {
  args: {
    mode: 'free',
    selected: true,
    disabled: false,
  },
};

/**
 * Free mode in disabled state (e.g., when no API keys configured).
 */
export const FreeDisabled: Story = {
  args: {
    mode: 'free',
    selected: false,
    disabled: true,
  },
};

/**
 * Pro mode - uses multiple AI providers simultaneously for ensemble responses.
 */
export const ProUnselected: Story = {
  args: {
    mode: 'pro',
    selected: false,
    disabled: false,
  },
};

/**
 * Pro mode in selected state.
 */
export const ProSelected: Story = {
  args: {
    mode: 'pro',
    selected: true,
    disabled: false,
  },
};

/**
 * Pro mode in disabled state (e.g., when insufficient API keys configured).
 */
export const ProDisabled: Story = {
  args: {
    mode: 'pro',
    selected: false,
    disabled: true,
  },
};

/**
 * Interactive example showing mode selection behavior with onClick handler.
 */
export const Interactive: Story = {
  args: {
    mode: 'free',
    selected: false,
    disabled: false,
  },
  render: function Render(_args) {
    const [selectedMode, setSelectedMode] = React.useState<'free' | 'pro' | null>(null);

    return (
      <div className="flex flex-col gap-4 w-[400px]">
        <ModeSelectionCard
          mode="free"
          selected={selectedMode === 'free'}
          onClick={() => setSelectedMode('free')}
        />
        <ModeSelectionCard
          mode="pro"
          selected={selectedMode === 'pro'}
          onClick={() => setSelectedMode('pro')}
        />
      </div>
    );
  },
};

/**
 * Both modes displayed together in unselected state.
 */
export const BothModes: Story = {
  args: {
    mode: 'free',
    selected: false,
  },
  render: () => (
    <div className="flex flex-col gap-4 w-[400px]">
      <ModeSelectionCard mode="free" selected={false} />
      <ModeSelectionCard mode="pro" selected={false} />
    </div>
  ),
};

/**
 * Both modes with one selected.
 */
export const BothModesWithSelection: Story = {
  args: {
    mode: 'free',
    selected: true,
  },
  render: () => (
    <div className="flex flex-col gap-4 w-[400px]">
      <ModeSelectionCard mode="free" selected={true} />
      <ModeSelectionCard mode="pro" selected={false} />
    </div>
  ),
};

/**
 * Both modes showing disabled states (e.g., when no API keys configured).
 */
export const BothModesDisabled: Story = {
  args: {
    mode: 'free',
    selected: false,
    disabled: true,
  },
  render: () => (
    <div className="flex flex-col gap-4 w-[400px]">
      <ModeSelectionCard mode="free" selected={false} disabled={true} />
      <ModeSelectionCard mode="pro" selected={false} disabled={true} />
    </div>
  ),
};

/**
 * Keyboard navigation example (use Tab and Enter/Space to interact).
 */
export const KeyboardNavigation: Story = {
  args: {
    mode: 'free',
    selected: false,
  },
  render: function Render() {
    const [selectedMode, setSelectedMode] = React.useState<'free' | 'pro' | null>('free');

    return (
      <div className="flex flex-col gap-4 w-[400px]">
        <p className="text-sm text-muted-foreground mb-2">
          Use Tab to navigate, Enter/Space to select
        </p>
        <ModeSelectionCard
          mode="free"
          selected={selectedMode === 'free'}
          onClick={() => setSelectedMode('free')}
        />
        <ModeSelectionCard
          mode="pro"
          selected={selectedMode === 'pro'}
          onClick={() => setSelectedMode('pro')}
        />
      </div>
    );
  },
};

/**
 * Dark mode - both modes with one selected.
 */
export const DarkMode: Story = {
  args: {
    mode: 'free',
    selected: true,
  },
  render: () => (
    <div className="flex flex-col gap-4 w-[400px]">
      <ModeSelectionCard mode="free" selected={true} />
      <ModeSelectionCard mode="pro" selected={false} />
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

// Add React import for interactive stories
import * as React from 'react';
