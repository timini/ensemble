import type { Meta, StoryObj } from '@storybook/react';
import { ExampleRun } from './ExampleRun';
import { exampleRunArgs } from './ExampleRun.fixtures';

const meta = {
  title: 'Organisms/ExampleRun',
  component: ExampleRun,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: exampleRunArgs,
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof ExampleRun>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A recorded run with high agreement, as on the landing page. */
export const Recorded: Story = {};

/** Mixed agreement. */
export const Mixed: Story = { args: { score: 0.62, level: 'medium' } };

/** Low agreement. */
export const Low: Story = { args: { score: 0.31, level: 'low' } };

/** Calibrated labels: no uncalibrated note. */
export const Calibrated: Story = { args: { calibrated: true } };

/** Fallback when no real run could be recorded: labelled as illustrative. */
export const Illustrative: Story = { args: { illustrative: true } };
