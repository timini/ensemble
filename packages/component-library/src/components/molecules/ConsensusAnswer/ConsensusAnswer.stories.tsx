import type { Meta, StoryObj } from '@storybook/react';
import { ConsensusAnswer } from './ConsensusAnswer';
import { sampleConsensus } from './fixtures';

const meta = {
  title: 'Molecules/ConsensusAnswer',
  component: ConsensusAnswer,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    status: 'success',
    text: sampleConsensus,
    method: 'standard',
    summarizerName: 'Claude Opus 5.5',
    cost: { variant: 'actual', callCount: 7, totalUsd: 0.011, estimated: false, pricedCallCount: 7, unpricedCallCount: 0 },
    durationMs: 6200,
    onShare: () => undefined,
  },
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
} satisfies Meta<typeof ConsensusAnswer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The merged answer with its cost. */
export const Success: Story = {};

/** Majority: a mechanical vote on short answers. */
export const MajorityVote: Story = {
  args: {
    method: 'majority',
    text: '**42**',
    majorityVote: {
      outcome: 'winner',
      totalResponses: 3,
      options: [
        { answer: '42', votes: 2, models: ['GPT-6.1 Sol', 'Claude Opus 5.5'] },
        { answer: '41', votes: 1, models: ['Gemini 4 Carbon'] },
      ],
    },
  },
};

/** Answers still arriving: the footer shows the estimate. */
export const Awaiting: Story = {
  args: {
    status: 'awaiting',
    cost: {
      variant: 'estimate',
      calls: { answers: 3, consensus: 1, consensusMin: 1, embeddings: 3, total: 7 },
      consensusAvailable: true,
      lowUsd: 0.004,
      highUsd: 0.012,
      pricedCallCount: 7,
      unpricedCallCount: 0,
    },
    durationMs: undefined,
  },
};

/** The summarizer is writing. */
export const Generating: Story = { args: { status: 'generating' } };

/** The summarizer failed. */
export const Failed: Story = { args: { status: 'failed', error: 'Anthropic API error: 529 Overloaded.', onRetry: () => undefined } };

/** A run reopened from history that was saved before its consensus was written, or whose consensus failed. */
export const NotSaved: Story = { args: { status: 'notSaved', text: undefined } };

/** Council with two answers: no consensus. */
export const Unavailable: Story = { args: { status: 'unavailable', method: 'council', cost: undefined, durationMs: undefined } };
