import type { Meta, StoryObj } from '@storybook/react';
import { RunHistory } from './RunHistory';

const meta = {
  title: 'Molecules/RunHistory',
  component: RunHistory,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    status: 'ready',
    items: [
      { id: '3', date: 'Today, 09:41', models: ['Claude Sonnet 5.5', 'GPT-6 Luna', 'Gemini 3.5 Flash Lite'], calls: 7, amount: '$0.09' },
      { id: '2', date: 'Yesterday, 17:02', models: ['Claude Sonnet 5.5', 'GPT-6 Luna'], calls: 4, amount: '$0.05' },
      { id: '1', date: '10 Nov 2026, 11:15', models: ['GPT-6 Luna'], calls: 1, amount: '$0.0012' },
    ],
  },
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
} satisfies Meta<typeof RunHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Settled runs, newest first. */
export const Default: Story = {};

/** More runs to load. */
export const WithMore: Story = { args: { hasMore: true, onLoadMore: () => undefined } };

/** No Pro run yet. */
export const Empty: Story = { args: { items: [] } };

/** Loading. */
export const Loading: Story = { args: { status: 'loading', items: [] } };
