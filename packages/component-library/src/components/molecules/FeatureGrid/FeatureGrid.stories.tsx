import type { Meta, StoryObj } from '@storybook/react';
import { FeatureGrid } from './FeatureGrid';

const meta = {
  title: 'Molecules/FeatureGrid',
  component: FeatureGrid,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    heading: 'Ask and compare',
    items: [
      { id: 'side', title: 'Answers side by side', body: 'Two to six models answer at once, each in its own column.' },
      { id: 'score', title: 'An agreement score you can read', body: 'Answers are compared pair by pair with semantic embeddings.' },
      { id: 'merge', title: 'One merged answer', body: 'Standard, Majority, Ranked or Council.' },
    ],
  },
} satisfies Meta<typeof FeatureGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three columns. */
export const Default: Story = {};

/** Two columns with an intro. */
export const TwoColumns: Story = { args: { columns: 2, intro: 'What a run gives you.' } };
