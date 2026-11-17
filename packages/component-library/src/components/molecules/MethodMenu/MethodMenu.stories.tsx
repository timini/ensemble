import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus';
import { MethodMenu } from './MethodMenu';
import { estimate, sampleEstimates } from './fixtures';

const summarizers = [
  { id: 'anthropic/claude-opus-5.5', name: 'Claude Opus 5.5' },
  { id: 'openai/gpt-6.1', name: 'GPT-6.1 Sol' },
  { id: 'google/gemini-4-carbon', name: 'Gemini 4 Carbon' },
];

const meta = {
  title: 'Molecules/MethodMenu',
  component: MethodMenu,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    method: 'standard',
    onMethodChange: () => undefined,
    estimates: sampleEstimates,
    summarizers,
    summarizerId: summarizers[0].id,
    onSummarizerChange: () => undefined,
  },
  render: function Render(args) {
    const [method, setMethod] = React.useState<ConsensusMethod>(args.method);
    const [summarizer, setSummarizer] = React.useState(args.summarizerId);
    return (
      <div className="min-h-[460px]">
        <MethodMenu {...args} method={method} onMethodChange={setMethod} summarizerId={summarizer} onSummarizerChange={setSummarizer} />
      </div>
    );
  },
} satisfies Meta<typeof MethodMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: the method with its calls and cost range. */
export const Closed: Story = {};

/** Open, with the summarizer choice. */
export const Open: Story = { args: { defaultOpen: true } };

/** Two models: Ranked and Council need three answers. */
export const TwoModels: Story = {
  args: {
    defaultOpen: true,
    estimates: {
      ...sampleEstimates,
      elo: estimate(6, 0.003, 0.009, { available: false }),
      council: estimate(6, 0.003, 0.009, { available: false }),
    },
  },
};

/** Local models only: every method is free. */
export const LocalOnly: Story = {
  args: {
    defaultOpen: true,
    estimates: {
      standard: estimate(7, 0, 0, { local: 7 }),
      majority: estimate(7, 0, 0, { local: 7 }),
      elo: estimate(13, 0, 0, { local: 13 }),
      council: estimate(22, 0, 0, { local: 22 }),
    },
  },
};

/** A model with no price: costs are lower bounds. */
export const PartlyPriced: Story = {
  args: {
    estimates: {
      standard: estimate(7, 0.002, 0.008, { priced: 5, unpriced: 2 }),
      majority: estimate(7, 0.002, 0.008, { priced: 5, unpriced: 2 }),
      elo: estimate(13, 0.004, 0.02, { priced: 9, unpriced: 4 }),
      council: estimate(22, 0, 0, { priced: 0, unpriced: 22 }),
    },
    defaultOpen: true,
  },
};
