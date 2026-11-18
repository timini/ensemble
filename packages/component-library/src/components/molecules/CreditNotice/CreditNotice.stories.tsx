import type { Meta, StoryObj } from '@storybook/react';
import { CreditNotice } from './CreditNotice';

const meta = {
  title: 'Molecules/CreditNotice',
  component: CreditNotice,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    variant: 'balance',
    balance: '$4.20',
    packs: [
      { id: 'pack-5', label: '$5' },
      { id: 'pack-20', label: '$20' },
      { id: 'pack-50', label: '$50' },
    ],
    onBuy: () => undefined,
  },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof CreditNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The balance, with a buy button per pack. */
export const Balance: Story = {};

/** The balance is low (FR-038). */
export const Low: Story = { args: { variant: 'low', balance: '$0.42' } };

/** The run needs more credits than the balance (FR-036). */
export const Insufficient: Story = { args: { variant: 'insufficient', balance: '$0.04', required: '$0.12' } };

/** Models Pro has no price for, so it cannot run them. */
export const Unpriced: Story = { args: { variant: 'unpriced', unpricedModels: ['qwen3:14b', 'Mistral Large 3'] } };

/** The balance could not load. */
export const LoadError: Story = { args: { variant: 'error', balance: undefined } };

/** A checkout is starting for the $20 pack. */
export const Pending: Story = { args: { variant: 'low', balance: '$0.42', pendingPackId: 'pack-20' } };

/** The checkout could not start. */
export const BuyError: Story = { args: { variant: 'low', balance: '$0.42', buyError: true } };

/** No buy handler: the balance only. */
export const WithoutBuy: Story = { args: { onBuy: undefined } };
