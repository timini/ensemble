import type { Meta, StoryObj } from '@storybook/react';
import { EnsembleConfigurationSummary } from './EnsembleConfigurationSummary';

const meta = {
  title: 'Organisms/EnsembleConfigurationSummary/Interactive',
  component: EnsembleConfigurationSummary,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EnsembleConfigurationSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive summarizer selection
export const InteractiveSummarizer: Story = {
  args: {
    selectedModels: [
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229',
      'gpt-4-turbo',
    ],
    summarizerModel: 'claude-3-opus-20240229',
    onSummarizerChange: (modelId: string) => {
      console.log('New summarizer:', modelId);
    },
  },
};

// Interactive - Single model edge case
export const InteractiveSingleModel: Story = {
  args: {
    selectedModels: ['claude-3-opus-20240229'],
    summarizerModel: 'claude-3-opus-20240229',
    onSummarizerChange: (modelId: string) => {
      console.log('New summarizer:', modelId);
    },
  },
};

// Static (no callback) - existing behavior preserved
export const StaticNonInteractive: Story = {
  args: {
    selectedModels: [
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229',
      'gpt-4-turbo',
    ],
    summarizerModel: 'claude-3-opus-20240229',
  },
};
