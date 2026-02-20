import type { Meta, StoryObj } from '@storybook/react';
import { ModelCard } from './ModelCard';

const meta = {
  title: 'Molecules/ModelCard',
  component: ModelCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    provider: {
      control: 'select',
      options: ['openai', 'anthropic', 'google', 'xai', 'perplexity'],
      description: 'AI provider for the model',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the model is currently selected',
    },
    isSummarizer: {
      control: 'boolean',
      description: 'Whether this model is designated as the summarizer',
    },
    modalities: {
      control: 'object',
      description: 'Supported modalities for the model',
    },
  },
} satisfies Meta<typeof ModelCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic states
export const Unselected: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4',
    selected: false,
    isSummarizer: false,
  },
};

export const Selected: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4',
    selected: true,
    isSummarizer: false,
  },
};

export const Summarizer: Story = {
  args: {
    provider: 'anthropic',
    modelName: 'Claude 3.5 Sonnet',
    selected: true,
    isSummarizer: true,
  },
};

export const WithModalities: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4o',
    modelId: 'gpt-4o',
    selected: true,
    isSummarizer: false,
    modalities: ['text', 'image'],
  },
};

export const AudioCapable: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4o Realtime',
    modelId: 'gpt-4o-realtime',
    selected: false,
    isSummarizer: false,
    modalities: ['text', 'audio'],
  },
};

// Different providers - unselected
export const OpenAIUnselected: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4 Turbo',
    selected: false,
    isSummarizer: false,
  },
};

export const AnthropicUnselected: Story = {
  args: {
    provider: 'anthropic',
    modelName: 'Claude 3.5 Sonnet',
    selected: false,
    isSummarizer: false,
  },
};

export const GoogleUnselected: Story = {
  args: {
    provider: 'google',
    modelName: 'Gemini Pro',
    selected: false,
    isSummarizer: false,
  },
};

export const XAIUnselected: Story = {
  args: {
    provider: 'xai',
    modelName: 'Grok',
    selected: false,
    isSummarizer: false,
  },
};

// Different providers - selected
export const OpenAISelected: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4 Turbo',
    selected: true,
    isSummarizer: false,
  },
};

export const AnthropicSelected: Story = {
  args: {
    provider: 'anthropic',
    modelName: 'Claude 3.5 Sonnet',
    selected: true,
    isSummarizer: false,
  },
};

export const GoogleSelected: Story = {
  args: {
    provider: 'google',
    modelName: 'Gemini Pro',
    selected: true,
    isSummarizer: false,
  },
};

export const XAISelected: Story = {
  args: {
    provider: 'xai',
    modelName: 'Grok',
    selected: true,
    isSummarizer: false,
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4',
    selected: false,
    isSummarizer: false,
    disabled: true,
  },
};

export const DisabledSelected: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4',
    selected: true,
    isSummarizer: false,
    disabled: true,
  },
};

// Interactive example
export const Interactive: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4',
    selected: false,
    isSummarizer: false,
    onClick: () => console.log('Model card clicked'),
  },
};

// All providers showcase
export const AllProviders: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4',
    selected: false,
    isSummarizer: false,
  },
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <ModelCard
        provider="openai"
        modelName="GPT-4 Turbo"
        selected={true}
        isSummarizer={false}
        modalities={['text', 'image']}
      />
      <ModelCard
        provider="anthropic"
        modelName="Claude 3.5 Sonnet"
        selected={true}
        isSummarizer={true}
        modalities={['text', 'image']}
      />
      <ModelCard
        provider="google"
        modelName="Gemini Pro"
        selected={true}
        isSummarizer={false}
        modalities={['text', 'image']}
      />
      <ModelCard
        provider="xai"
        modelName="Grok"
        selected={false}
        isSummarizer={false}
        modalities={['text']}
      />
    </div>
  ),
};
