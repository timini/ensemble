import type { Meta, StoryObj } from '@storybook/react';
import { AnswerCard } from './AnswerCard';
import { sampleAnswers } from '../../organisms/AnswerColumns/fixtures';

const complete = sampleAnswers[1];

const meta = {
  title: 'Molecules/AnswerCard',
  component: AnswerCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: complete,
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof AnswerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A finished answer with its time and cost. */
export const Complete: Story = {};

/** Sent, no tokens yet. */
export const Waiting: Story = { args: { status: 'waiting', content: undefined } };

/** Tokens arriving. */
export const Streaming: Story = { args: { status: 'streaming', content: 'Roughly 68 to 71 °C, depending on' } };

/** Rate limited, with a retry for this model. */
export const RateLimited: Story = {
  args: { status: 'error', errorKind: 'rate_limited', retryAfterSeconds: 30, error: '429 Rate limit reached.', onRetry: () => undefined },
};

/** Key rejected. */
export const InvalidKey: Story = {
  args: { status: 'error', errorKind: 'invalid_key', error: '401 Incorrect API key provided.', onRetry: () => undefined },
};

/** A local model through Ollama, free. */
export const LocalModel: Story = {
  args: { modelName: 'qwen3:14b', provider: 'openai-compatible', providerLabel: 'Ollama', costUsd: 0 },
};

/** An answer pasted from another tool. */
export const Manual: Story = {
  args: { modelName: 'Answer from my notes', kind: 'manual', provider: undefined, durationMs: undefined, costUsd: undefined },
};
