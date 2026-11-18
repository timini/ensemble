import type { Meta, StoryObj } from '@storybook/react';
import { AnswerColumns } from './AnswerColumns';
import { sampleAnswers } from './fixtures';

const meta = {
  title: 'Organisms/AnswerColumns',
  component: AnswerColumns,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { answers: sampleAnswers },
} satisfies Meta<typeof AnswerColumns>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three finished answers. */
export const Complete: Story = {};

/** Mid run: one streaming, one waiting, one done. */
export const Streaming: Story = {
  args: {
    answers: [
      { ...sampleAnswers[0], status: 'streaming', content: 'About 70 °C. Air pressure at the summit is roughly 34 kPa,' },
      { ...sampleAnswers[1], status: 'waiting', content: undefined },
      sampleAnswers[2],
    ],
  },
};

/** One model failed and can be retried on its own. */
export const WithError: Story = {
  args: {
    answers: [
      sampleAnswers[0],
      { ...sampleAnswers[1], status: 'error', errorKind: 'rate_limited', retryAfterSeconds: 20, error: '429', onRetry: () => undefined },
      sampleAnswers[2],
    ],
  },
};

/** Two answers, one pasted by hand. */
export const TwoWithManual: Story = {
  args: {
    answers: [
      sampleAnswers[0],
      { id: 'manual-1', modelName: 'Answer from my notes', kind: 'manual', status: 'complete', content: 'Around 70 °C at the summit.' },
    ],
  },
};

/** Phone width: swipeable tabs. */
export const Mobile: Story = { globals: { viewport: { value: 'mobile1' } } };
