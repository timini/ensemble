import type { Meta, StoryObj } from '@storybook/react';
import { ModeSelector } from './ModeSelector';

const meta = {
  title: 'Organisms/ModeSelector',
  component: ModeSelector,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedMode: {
      control: 'radio',
      options: ['free', 'pro', undefined],
      description: 'Currently selected mode',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the component is disabled',
    },
  },
} satisfies Meta<typeof ModeSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story - no mode selected
export const Default: Story = {
  args: {
    onSelectFreeMode: () => console.log('Free mode selected'),
    onSelectProMode: () => console.log('Pro mode selected'),
  },
};

// Free mode selected
export const FreeModeSelected: Story = {
  args: {
    selectedMode: 'free',
    onSelectFreeMode: () => console.log('Free mode selected'),
    onSelectProMode: () => console.log('Pro mode selected'),
  },
};

// Pro mode selected
export const ProModeSelected: Story = {
  args: {
    selectedMode: 'pro',
    onSelectFreeMode: () => console.log('Free mode selected'),
    onSelectProMode: () => console.log('Pro mode selected'),
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    disabled: true,
    onSelectFreeMode: () => console.log('Free mode selected'),
    onSelectProMode: () => console.log('Pro mode selected'),
  },
};

// Disabled with Free mode selected
export const DisabledFreeModeSelected: Story = {
  args: {
    selectedMode: 'free',
    disabled: true,
    onSelectFreeMode: () => console.log('Free mode selected'),
    onSelectProMode: () => console.log('Pro mode selected'),
  },
};

// Disabled with Pro mode selected
export const DisabledProModeSelected: Story = {
  args: {
    selectedMode: 'pro',
    disabled: true,
    onSelectFreeMode: () => console.log('Free mode selected'),
    onSelectProMode: () => console.log('Pro mode selected'),
  },
};
