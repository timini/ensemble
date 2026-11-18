import type { Meta, StoryObj } from '@storybook/react';
import { AccountDashboard } from './AccountDashboard';

const packs = [
  { id: 'usd-5', label: '$5' },
  { id: 'usd-20', label: '$20' },
  { id: 'usd-50', label: '$50' },
];

const meta = {
  title: 'Organisms/AccountDashboard',
  component: AccountDashboard,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    email: 'ada@example.com',
    balance: { state: 'ok', balance: '$22.03', packs, onBuy: () => undefined },
    usage: {
      status: 'ready',
      days: 30,
      items: [
        { id: 'a', name: 'Claude Sonnet 5.5', runs: 14, calls: 41, tokens: '182k', amount: '$1.84', share: 0.62 },
        { id: 'b', name: 'GPT-6 Luna', runs: 14, calls: 14, tokens: '51k', amount: '$0.71', share: 0.24 },
        { id: 'c', name: 'Gemini 3.5 Flash Lite', runs: 11, calls: 30, tokens: '96k', amount: '$0.42', share: 0.14 },
      ],
    },
    purchases: {
      status: 'ready',
      items: [
        { id: 'r', kind: 'refund', amount: '-$20.00', date: '12 Nov 2026', negative: true },
        { id: 'p2', kind: 'purchase', pack: '$20', amount: '+$20.00', date: '3 Nov 2026' },
        { id: 'p1', kind: 'purchase', pack: '$5', amount: '+$5.00', date: '28 Oct 2026' },
      ],
      hasMore: true,
      onLoadMore: () => undefined,
    },
    runs: {
      status: 'ready',
      items: [
        { id: '3', date: 'Today, 09:41', models: ['Claude Sonnet 5.5', 'GPT-6 Luna', 'Gemini 3.5 Flash Lite'], calls: 7, amount: '$0.09' },
        { id: '2', date: 'Yesterday, 17:02', models: ['Claude Sonnet 5.5', 'GPT-6 Luna'], calls: 4, amount: '$0.05' },
      ],
      hasMore: true,
      onLoadMore: () => undefined,
    },
  },
} satisfies Meta<typeof AccountDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A Pro account with usage. */
export const Ready: Story = {};

/** A new account: no purchases or runs yet. */
export const NewAccount: Story = {
  args: {
    balance: { state: 'low', balance: '$0.00', packs, onBuy: () => undefined },
    usage: { status: 'ready', days: 30, items: [] },
    purchases: { status: 'ready', items: [] },
    runs: { status: 'ready', items: [] },
  },
};

/** Below zero after a refund: Pro is paused. */
export const Negative: Story = {
  args: { balance: { state: 'negative', balance: '-$14.60', packs, onBuy: () => undefined } },
};

/** Everything is loading. */
export const Loading: Story = {
  args: {
    balance: null,
    usage: { status: 'loading', days: 30, items: [] },
    purchases: { status: 'loading', items: [] },
    runs: { status: 'loading', items: [] },
  },
};

/** The balance could not load. */
export const BalanceError: Story = { args: { balance: null, balanceError: true } };
