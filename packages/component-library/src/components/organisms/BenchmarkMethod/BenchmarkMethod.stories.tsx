import type { Meta, StoryObj } from '@storybook/react';
import { BenchmarkMethod } from './BenchmarkMethod';

const meta = {
  title: 'Organisms/BenchmarkMethod',
  component: BenchmarkMethod,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof BenchmarkMethod>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The committed M3 matrix. */
export const Default: Story = {
  args: {
    datasets: ['GSM8K', 'MMLU-Pro', 'GPQA', 'TruthfulQA'],
    sample: 200,
    questionSeed: 42,
    optionSeed: 1729,
    models: [
      { label: 'Qwen3.5 9B', spec: 'openrouter:qwen/qwen3.5-9b' },
      { label: 'Llama 3.1 8B Instruct', spec: 'openrouter:meta-llama/llama-3.1-8b-instruct' },
      { label: 'Gemma 3 12B', spec: 'openrouter:google/gemma-3-12b-it' },
    ],
    strategies: ['majority', 'standard'],
    summarizer: 'Qwen3.5 9B',
    reference: { label: 'Claude Sonnet 5.5', spec: 'openrouter:anthropic/claude-sonnet-5.5' },
    docsUrl: 'https://github.com/timini/ensemble/blob/main/packages/eval/docs/BENCHMARKS.md',
  },
};

/** A reference model with no published results yet: shown as coming soon. */
export const ReferencePending: Story = {
  args: { ...Default.args!, referencePending: true } as Story['args'],
};

/** A matrix with a single ensemble method. */
export const MajorityOnly: Story = {
  args: { ...Default.args!, strategies: ['majority'] } as Story['args'],
};
