import type { Meta, StoryObj } from '@storybook/react';
import { CreditBalanceCard } from './CreditBalanceCard';

const meta = {
  title: 'Molecules/CreditBalanceCard',
  component: CreditBalanceCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    state: 'ok',
    balance: '$22.03',
    packs: [
      { id: 'usd-5', label: '$5' },
      { id: 'usd-20', label: '$20' },
      { id: 'usd-50', label: '$50' },
    ],
    onBuy: () => undefined,
  },
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
} satisfies Meta<typeof CreditBalanceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A balance that needs no action. */
export const Ok: Story = {};

/** Under the low-balance threshold (FR-038). */
export const Low: Story = { args: { state: 'low', balance: '$0.42' } };

/** Below zero after a refund or dispute: Pro is paused. */
export const Negative: Story = { args: { state: 'negative', balance: '-$14.60' } };

/** A checkout is starting. */
export const Pending: Story = { args: { pendingPackId: 'usd-20' } };

/** The checkout could not start. */
export const BuyError: Story = { args: { buyError: true } };
