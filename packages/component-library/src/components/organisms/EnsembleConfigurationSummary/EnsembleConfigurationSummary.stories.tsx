import type { Meta, StoryObj } from '@storybook/react';
import { EnsembleConfigurationSummary } from './EnsembleConfigurationSummary';

const meta = {
  title: 'Organisms/EnsembleConfigurationSummary',
  component: EnsembleConfigurationSummary,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    heading: {
      control: 'text',
      description: 'Heading text for the configuration section',
    },
    description: {
      control: 'text',
      description: 'Description text explaining the configuration',
    },
  },
} satisfies Meta<typeof EnsembleConfigurationSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story - matching wireframe
export const Default: Story = {
  args: {
    selectedModels: ['claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    summarizerModel: 'claude-3-opus-20240229',
  },
};

// Multiple models
export const MultipleModels: Story = {
  args: {
    selectedModels: [
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'gemini-pro',
    ],
    summarizerModel: 'claude-3-opus-20240229',
  },
};

// Single model
export const SingleModel: Story = {
  args: {
    selectedModels: ['claude-3-opus-20240229'],
    summarizerModel: 'claude-3-opus-20240229',
  },
};

// Many models (wrapping test)
export const ManyModels: Story = {
  args: {
    selectedModels: [
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gemini-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'grok-beta',
    ],
    summarizerModel: 'claude-3-opus-20240229',
  },
};

// Different summarizer
export const DifferentSummarizer: Story = {
  args: {
    selectedModels: [
      'claude-3-haiku-20240307',
      'gpt-4-turbo',
      'gemini-pro',
    ],
    summarizerModel: 'gpt-4-turbo',
  },
};

// Custom heading
export const CustomHeading: Story = {
  args: {
    selectedModels: ['claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    summarizerModel: 'claude-3-opus-20240229',
    heading: 'Review Your Configuration',
  },
};

// Custom description
export const CustomDescription: Story = {
  args: {
    selectedModels: ['claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    summarizerModel: 'claude-3-opus-20240229',
    description: 'All selected models will process your prompt simultaneously.',
  },
};

// Custom heading and description
export const CustomContent: Story = {
  args: {
    selectedModels: ['claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    summarizerModel: 'claude-3-opus-20240229',
    heading: 'Ensemble Summary',
    description: 'Your AI ensemble is ready to process prompts.',
  },
};

// Empty models (edge case)
export const EmptyModels: Story = {
  args: {
    selectedModels: [],
    summarizerModel: 'claude-3-opus-20240229',
  },
};

// Dark mode
export const DarkMode: Story = {
  args: {
    selectedModels: [
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229',
      'gpt-4-turbo',
    ],
    summarizerModel: 'claude-3-opus-20240229',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

// Dark mode with consensus controls
export const DarkModeWithConsensus: Story = {
  args: {
    selectedModels: [
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229',
      'gpt-4-turbo',
    ],
    summarizerModel: 'claude-3-opus-20240229',
    consensusMethod: 'standard',
    onConsensusMethodChange: () => {},
    onTopNChange: () => {},
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

export const MajorityVotingConsensus: Story = {
  args: {
    selectedModels: [
      'claude-3-opus-20240229',
      'gpt-4-turbo',
    ],
    summarizerModel: 'gpt-4-turbo',
    consensusMethod: 'majority',
    onConsensusMethodChange: () => {},
    onTopNChange: () => {},
  },
};

// Long model names
export const LongModelNames: Story = {
  args: {
    selectedModels: [
      'anthropic-claude-3-haiku-20240307-with-extended-context',
      'openai-gpt-4-turbo-preview-with-vision-capabilities',
      'google-gemini-1.5-pro-with-multimodal-support',
    ],
    summarizerModel: 'anthropic-claude-3-opus-20240229-latest',
  },
};
