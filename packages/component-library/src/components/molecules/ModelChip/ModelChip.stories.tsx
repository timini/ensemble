import type { Meta, StoryObj } from '@storybook/react';
import { ModelChip } from './ModelChip';

const meta = {
  title: 'Molecules/ModelChip',
  component: ModelChip,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { name: 'Claude Opus 5.5', provider: 'anthropic', onRemove: () => undefined },
} satisfies Meta<typeof ModelChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A model in the ensemble, removable. */
export const Model: Story = {};

/** A local model through an OpenAI-compatible endpoint. */
export const LocalModel: Story = { args: { name: 'qwen3:14b', provider: 'openai-compatible' } };

/** An answer pasted from another tool. */
export const Manual: Story = { args: { name: 'Answer from my notes', kind: 'manual', provider: undefined } };

/** Read only, while a run is going. */
export const ReadOnly: Story = { args: { onRemove: undefined } };
