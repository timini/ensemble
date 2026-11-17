import type { Meta, StoryObj } from '@storybook/react';
import { MajorityVoteBreakdown } from './MajorityVoteBreakdown';

const meta = {
  title: 'Molecules/MajorityVoteBreakdown',
  component: MajorityVoteBreakdown,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof MajorityVoteBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A numeric answer wins three of four votes. */
export const Winner: Story = {
  args: {
    outcome: 'winner',
    totalResponses: 4,
    options: [
      { answer: '42', votes: 3, models: ['GPT-6 Astra', 'Claude Opus 5.5', 'Gemini 3 Pro'] },
      { answer: '41', votes: 1, models: ['Grok 5'] },
    ],
  },
};

/** Yes wins, and one model gave no short answer. */
export const WinnerWithAbstention: Story = {
  args: {
    outcome: 'winner',
    totalResponses: 4,
    options: [
      { answer: 'Yes', votes: 2, models: ['GPT-6 Astra', 'Gemini 3 Pro'] },
      { answer: 'No', votes: 1, models: ['Grok 5'] },
    ],
    abstainedModels: ['DeepSeek V4'],
  },
};

/** Two option letters share the most votes, so the LLM method decides. */
export const Tie: Story = {
  args: {
    outcome: 'tie',
    totalResponses: 4,
    options: [
      { answer: 'B', votes: 2, models: ['GPT-6 Astra', 'Grok 5'] },
      { answer: 'C', votes: 2, models: ['Claude Opus 5.5', 'Gemini 3 Pro'] },
    ],
  },
};

/** Long-form answers: no vote, the LLM method decides. */
export const LongForm: Story = {
  args: {
    outcome: 'no-short-answers',
    totalResponses: 3,
    options: [],
    abstainedModels: ['GPT-6 Astra', 'Claude Opus 5.5', 'Gemini 3 Pro'],
  },
};

/** The extraction call failed: no vote, the LLM method decides. */
export const ExtractionFailed: Story = {
  args: {
    outcome: 'extraction-failed',
    totalResponses: 3,
    options: [],
  },
};
