import type { Meta, StoryObj } from '@storybook/react';
import { RunCostSummary } from './RunCostSummary';

const meta = {
  title: 'Molecules/RunCostSummary',
  component: RunCostSummary,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof RunCostSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before a standard run with three models. */
export const EstimateStandard: Story = {
  args: {
    variant: 'estimate',
    calls: { answers: 3, consensus: 1, consensusMin: 1, embeddings: 3, total: 7 },
    consensusAvailable: true,
    lowUsd: 0.0021,
    highUsd: 0.034,
    priceDate: '2026-11-16',
  },
};

/** Council with five models: 56 consensus calls, fewer if branches are rejected. */
export const EstimateCouncil: Story = {
  args: {
    variant: 'estimate',
    calls: { answers: 5, consensus: 56, consensusMin: 46, embeddings: 5, total: 66 },
    consensusAvailable: true,
    lowUsd: 0.12,
    highUsd: 1.85,
    priceDate: '2026-11-16',
  },
};

/** ELO with two models cannot run: it needs three answers. */
export const EstimateConsensusUnavailable: Story = {
  args: {
    variant: 'estimate',
    calls: { answers: 2, consensus: 0, consensusMin: 0, embeddings: 2, total: 4 },
    consensusAvailable: false,
    lowUsd: 0.001,
    highUsd: 0.01,
  },
};

/** Some models have no price in the table. */
export const EstimateWithUnpricedModels: Story = {
  args: {
    variant: 'estimate',
    calls: { answers: 2, consensus: 1, consensusMin: 1, embeddings: 2, total: 5 },
    consensusAvailable: true,
    lowUsd: 0.0004,
    highUsd: 0.004,
    unpricedModels: ['perplexity/perplexity-fast'],
  },
};

/** After a run where every provider reported token counts. */
export const ActualReported: Story = {
  args: {
    variant: 'actual',
    callCount: 7,
    totalUsd: 0.0123,
    estimated: false,
    priceDate: '2026-11-16',
  },
};

/** After a run where some calls were estimated from text length. */
export const ActualEstimated: Story = {
  args: {
    variant: 'actual',
    callCount: 7,
    totalUsd: 0.0123,
    estimated: true,
    unpricedModels: ['openai/text-embedding-3-small'],
  },
};
