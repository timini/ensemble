import type { Meta, StoryObj } from '@storybook/react';
import { ComposerSubmit } from './ComposerSubmit';

const meta = {
  title: 'Molecules/ComposerSubmit',
  component: ComposerSubmit,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { running: false, disabled: false },
} satisfies Meta<typeof ComposerSubmit>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ready to ask. */
export const Ask: Story = {};

/** Nothing to send yet. */
export const Disabled: Story = { args: { disabled: true } };

/** A run without a way to cancel it. */
export const Running: Story = { args: { running: true, disabled: true } };

/** A run the user can stop. */
export const RunningWithStop: Story = { args: { running: true, disabled: true, onStop: () => undefined } };
