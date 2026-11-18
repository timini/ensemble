import type { Meta, StoryObj } from '@storybook/react';
import { CreditPackButtons } from './CreditPackButtons';

const meta = {
  title: 'Molecules/CreditPackButtons',
  component: CreditPackButtons,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    packs: [
      { id: 'usd-5', label: '$5' },
      { id: 'usd-20', label: '$20' },
      { id: 'usd-50', label: '$50' },
    ],
    onBuy: () => undefined,
  },
} satisfies Meta<typeof CreditPackButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One button per pack, filled. */
export const Default: Story = {};

/** Outlined, beside a balance that needs no action. */
export const Outline: Story = { args: { variant: 'outline' } };

/** A checkout is starting for the $20 pack. */
export const Pending: Story = { args: { pendingPackId: 'usd-20' } };
