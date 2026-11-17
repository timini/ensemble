import type { Meta, StoryObj } from '@storybook/react';
import { ConsensusPanel } from './ConsensusPanel';
import { samplePairs } from '../../molecules/AgreementSummary/fixtures';
import { sampleConsensus } from '../../molecules/ConsensusAnswer/fixtures';

const cost = { variant: 'actual' as const, callCount: 7, totalUsd: 0.011, estimated: false, pricedCallCount: 7, unpricedCallCount: 0 };

const meta = {
  title: 'Organisms/ConsensusPanel',
  component: ConsensusPanel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    agreement: { status: 'ready', score: 0.86, pairs: samplePairs, calibration: { calibrated: true, embeddingModel: 'text-embedding-3-small' } },
    consensus: { status: 'success', text: sampleConsensus, method: 'standard', summarizerName: 'Claude Opus 5.5', cost, durationMs: 6200, onShare: () => undefined },
  },
} satisfies Meta<typeof ConsensusPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A finished run with high agreement. */
export const Complete: Story = {};

/** Low agreement with uncalibrated labels. */
export const LowUncalibrated: Story = {
  args: {
    agreement: {
      status: 'ready',
      score: 0.31,
      pairs: samplePairs.map((p, i) => ({ ...p, score: [0.44, 0.22, 0.27][i] })),
      calibration: { calibrated: false, embeddingModel: 'nomic-embed-text' },
    },
  },
};

/** Majority vote on a short answer. */
export const Majority: Story = {
  args: {
    consensus: {
      status: 'success',
      text: '**42**',
      method: 'majority',
      cost,
      majorityVote: {
        outcome: 'winner',
        totalResponses: 3,
        options: [
          { answer: '42', votes: 2, models: ['GPT-6.1 Sol', 'Claude Opus 5.5'] },
          { answer: '41', votes: 1, models: ['Gemini 4 Carbon'] },
        ],
      },
    },
  },
};

/** While answers stream: placeholders and the estimate. */
export const Running: Story = {
  args: {
    agreement: { status: 'pending', progress: { done: 2, total: 3 } },
    consensus: { status: 'awaiting', method: 'standard', summarizerName: 'Claude Opus 5.5' },
  },
};

/** No embedding model: no score, but a consensus. */
export const NoScore: Story = { args: { agreement: { status: 'unavailable' } } };
