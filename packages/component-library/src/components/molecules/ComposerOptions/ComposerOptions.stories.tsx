import type { Meta, StoryObj } from '@storybook/react';
import { ComposerOptions } from './ComposerOptions';

const meta = {
  title: 'Molecules/ComposerOptions',
  component: ComposerOptions,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { onAddManualResponse: () => undefined, onSavePreset: () => undefined },
  decorators: [(Story) => <div className="flex min-h-[200px] justify-end"><Story /></div>],
} satisfies Meta<typeof ComposerOptions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed. */
export const Default: Story = {};

/** Open with both actions. */
export const Open: Story = { args: { defaultOpen: true } };

/** Only the manual answer action. */
export const ManualOnly: Story = { args: { onSavePreset: undefined, defaultOpen: true } };
