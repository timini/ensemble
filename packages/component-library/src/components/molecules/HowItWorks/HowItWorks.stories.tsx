import type { Meta, StoryObj } from '@storybook/react';
import { HowItWorks } from './HowItWorks';

const meta = {
  title: 'Molecules/HowItWorks',
  component: HowItWorks,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof HowItWorks>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The three steps. */
export const Default: Story = {};
