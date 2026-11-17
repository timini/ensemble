import type { Meta, StoryObj } from '@storybook/react';
import { ScoreGuide } from './ScoreGuide';

const meta = {
  title: 'Molecules/ScoreGuide',
  component: ScoreGuide,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { benchmarksHref: '/benchmarks' },
} satisfies Meta<typeof ScoreGuide>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The three levels and the link to the benchmarks. */
export const Default: Story = {};
