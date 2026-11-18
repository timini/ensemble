import type { Meta, StoryObj } from '@storybook/react';
import { SharedRun } from './SharedRun';
import { samplePairs } from '../../molecules/AgreementSummary/fixtures';
import { sampleConsensus } from '../../molecules/ConsensusAnswer/fixtures';
import { sampleAnswers } from '../AnswerColumns/fixtures';

const meta = {
  title: 'Organisms/SharedRun',
  component: SharedRun,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    prompt: 'At what temperature does water boil at the top of Mount Everest?',
    sharedOn: '18 November 2026',
    expiresOn: '18 December 2026',
    agreement: { status: 'ready', score: 0.86, pairs: samplePairs, calibration: { calibrated: false, embeddingModel: 'text-embedding-3-small' } },
    consensus: { status: 'success', text: sampleConsensus, method: 'standard', summarizerName: 'Claude Opus 5.5' },
    answers: sampleAnswers,
    ctaHref: '/workspace',
  },
} satisfies Meta<typeof SharedRun>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A shared run with an agreement score and a consensus. */
export const Default: Story = {};

/** Low agreement: the answers differ, so the reader should compare them. */
export const LowAgreement: Story = {
  args: { agreement: { status: 'ready', score: 0.31, pairs: samplePairs.map((p) => ({ ...p, score: 0.3 })) } },
};

/** A run shared with no agreement score and no saved consensus. */
export const NoScore: Story = {
  args: { agreement: null, consensus: { status: 'notSaved', method: 'standard' } },
};

/** One answer failed; the others are still shown. */
export const WithFailedAnswer: Story = {
  args: {
    answers: [...sampleAnswers.slice(0, 2), { id: 'x', modelName: 'Grok 5', provider: 'xai', status: 'error', error: 'Rate limited by the provider.' }],
  },
};
