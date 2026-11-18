import type { Meta, StoryObj } from '@storybook/react';
import { PurchaseHistory } from './PurchaseHistory';

const meta = {
  title: 'Molecules/PurchaseHistory',
  component: PurchaseHistory,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    status: 'ready',
    items: [
      { id: 'r', kind: 'refund', amount: '-$20.00', date: '12 Nov 2026', negative: true },
      { id: 'p2', kind: 'purchase', pack: '$20', amount: '+$20.00', date: '3 Nov 2026' },
      { id: 'p1', kind: 'purchase', pack: '$5', amount: '+$5.00', date: '28 Oct 2026' },
      { id: 'g', kind: 'grant', amount: '+$1.00', date: '20 Oct 2026' },
    ],
  },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof PurchaseHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Purchases, a refund and a grant, newest first. */
export const Default: Story = {};

/** A dispute took credits back. */
export const Dispute: Story = {
  args: { items: [{ id: 'd', kind: 'dispute', amount: '-$5.00', date: '10 Nov 2026', negative: true }] },
};

/** More entries to load. */
export const WithMore: Story = { args: { hasMore: true, onLoadMore: () => undefined } };

/** No purchases yet. */
export const Empty: Story = { args: { items: [] } };

/** Loading. */
export const Loading: Story = { args: { status: 'loading', items: [] } };
