import type { Meta, StoryObj } from '@storybook/react';
import { ModelUsageList } from './ModelUsageList';

const meta = {
  title: 'Molecules/ModelUsageList',
  component: ModelUsageList,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    status: 'ready',
    days: 30,
    items: [
      { id: 'a', name: 'Claude Sonnet 5.5', runs: 14, calls: 41, tokens: '182k', amount: '$1.84', share: 0.62 },
      { id: 'b', name: 'GPT-6 Luna', runs: 14, calls: 14, tokens: '51k', amount: '$0.71', share: 0.24 },
      { id: 'c', name: 'Gemini 3.5 Flash Lite', runs: 11, calls: 30, tokens: '96k', amount: '$0.42', share: 0.14 },
    ],
  },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof ModelUsageList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Credits per model with their share. */
export const Default: Story = {};

/** More runs in the period than were counted. */
export const Truncated: Story = { args: { truncated: true } };

/** No Pro run in the period. */
export const Empty: Story = { args: { items: [] } };

/** Loading. */
export const Loading: Story = { args: { status: 'loading', items: [] } };

/** Could not load. */
export const LoadError: Story = { args: { status: 'error', items: [] } };
