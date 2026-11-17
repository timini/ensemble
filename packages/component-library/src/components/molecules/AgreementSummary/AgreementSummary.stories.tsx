import type { Meta, StoryObj } from '@storybook/react';
import { AgreementSummary } from './AgreementSummary';
import { samplePairs } from './fixtures';

const meta = {
  title: 'Molecules/AgreementSummary',
  component: AgreementSummary,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    status: 'ready',
    score: 0.86,
    pairs: samplePairs,
    // No embedding model is calibrated yet, so every real run shows this badge.
    calibration: { calibrated: false, embeddingModel: 'text-embedding-3-small' },
  },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof AgreementSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** High agreement, labels not yet calibrated for the embedding model (what every run shows today). */
export const High: Story = {};

/** Mixed agreement. */
export const Mixed: Story = {
  args: { score: 0.64, pairs: [{ ...samplePairs[0], score: 0.81 }, { ...samplePairs[1], score: 0.58 }, { ...samplePairs[2], score: 0.52 }] },
};

/** Low agreement: read every answer. */
export const Low: Story = {
  args: { score: 0.31, pairs: [{ ...samplePairs[0], score: 0.44 }, { ...samplePairs[1], score: 0.22 }, { ...samplePairs[2], score: 0.27 }] },
};

/** Labels from the default mapping with a local embedding model. */
export const Uncalibrated: Story = { args: { calibration: { calibrated: false, embeddingModel: 'nomic-embed-text' } } };

/**
 * Not a state the product can show yet: no embedding model has been
 * calibrated. Kept to review the layout once calibration lands.
 */
export const CalibratedFuture: Story = { args: { calibration: { calibrated: true, embeddingModel: 'text-embedding-3-small' } } };

/** Answers still arriving. */
export const Pending: Story = { args: { status: 'pending', progress: { done: 2, total: 3 } } };

/** No embedding model configured. */
export const Unavailable: Story = { args: { status: 'unavailable' } };

/** No embedding model, with a way to open settings. */
export const UnavailableWithSettings: Story = { args: { status: 'unavailable', onOpenSettings: () => undefined } };

/** A connected Ollama with no embedding model: the command that installs one. */
export const UnavailableOllamaPull: Story = { args: { status: 'unavailable', command: 'ollama pull nomic-embed-text', onOpenSettings: () => undefined } };

/** The embedding calls failed. */
export const ScoringError: Story = { args: { status: 'unavailable', reason: 'error' } };

/** Fewer than 2 answers succeeded. */
export const TooFewAnswers: Story = { args: { status: 'unavailable', reason: 'tooFewAnswers' } };

/** One answer had no embedding and was left out. */
export const PartlyScored: Story = { args: { pairs: samplePairs.slice(0, 1), excluded: ['Gemini 4 Carbon'] } };
