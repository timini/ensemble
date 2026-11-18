import type { Meta, StoryObj } from '@storybook/react';
import { BenchmarksNotRun } from './BenchmarksNotRun';

const meta = {
  title: 'Molecules/BenchmarksNotRun',
  component: BenchmarksNotRun,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof BenchmarksNotRun>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No results yet, with the cost estimate of a full run. */
export const WithEstimate: Story = {
  args: {
    command: 'npm run bench:matrix --workspace=packages/eval',
    estimate: { lowUsd: 2.18, highUsd: 18.27, calls: 3990 },
  },
};

/** No results and no estimate. */
export const WithoutEstimate: Story = {
  args: { command: 'npm run bench:matrix --workspace=packages/eval', estimate: null },
};
