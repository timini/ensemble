import type { Meta, StoryObj } from '@storybook/react';
import { AccuracyInterval } from './AccuracyInterval';

const meta = {
  title: 'Molecules/AccuracyInterval',
  component: AccuracyInterval,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof AccuracyInterval>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A typical result: 72% with its 95% Wilson interval on 200 questions. */
export const Default: Story = {
  args: { accuracy: 0.72, lower: 0.654, upper: 0.777 },
};

/** The best single model is drawn with the primary colour. */
export const Highlighted: Story = {
  args: { accuracy: 0.81, lower: 0.75, upper: 0.858, highlighted: true },
};

/** A wide interval from a small sample. */
export const SmallSample: Story = {
  args: { accuracy: 0.4, lower: 0.168, upper: 0.687 },
};

/** Nothing right: the bar is empty and the interval starts at zero. */
export const Zero: Story = {
  args: { accuracy: 0, lower: 0, upper: 0.434 },
};
