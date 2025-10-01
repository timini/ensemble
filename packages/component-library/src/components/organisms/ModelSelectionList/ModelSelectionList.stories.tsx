import type { Meta, StoryObj } from '@storybook/react';
import { ModelSelectionList } from './ModelSelectionList';
import * as React from 'react';

const meta = {
  title: 'Organisms/ModelSelectionList',
  component: ModelSelectionList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    models: {
      description: 'Array of available models',
    },
    selectedModelIds: {
      description: 'Array of selected model IDs',
    },
    summarizerModelId: {
      description: 'ID of the model designated as summarizer',
    },
    maxSelection: {
      description: 'Maximum number of models that can be selected',
    },
    onModelToggle: {
      description: 'Callback when a model is selected/deselected',
    },
    onSummarizerChange: {
      description: 'Callback when summarizer designation changes',
    },
  },
} satisfies Meta<typeof ModelSelectionList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock model data matching wireframe providers
const mockModels = [
  { id: 'gpt-4', provider: 'openai' as const, name: 'GPT-4' },
  { id: 'gpt-4-turbo', provider: 'openai' as const, name: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', provider: 'openai' as const, name: 'GPT-3.5 Turbo' },
  { id: 'claude-3-opus', provider: 'anthropic' as const, name: 'Claude 3 Opus' },
  { id: 'claude-3-sonnet', provider: 'anthropic' as const, name: 'Claude 3 Sonnet' },
  { id: 'claude-3-haiku', provider: 'anthropic' as const, name: 'Claude 3 Haiku' },
  { id: 'gemini-pro', provider: 'google' as const, name: 'Gemini Pro' },
  { id: 'gemini-ultra', provider: 'google' as const, name: 'Gemini Ultra' },
  { id: 'gemini-nano', provider: 'google' as const, name: 'Gemini Nano' },
  { id: 'grok-1', provider: 'xai' as const, name: 'Grok 1' },
  { id: 'grok-1.5', provider: 'xai' as const, name: 'Grok 1.5' },
  { id: 'grok-2', provider: 'xai' as const, name: 'Grok 2' },
];

// Default - matches wireframe with status indicators
export const Default: Story = {
  args: {
    models: mockModels,
    selectedModelIds: ['claude-3-opus', 'claude-3-haiku'],
    summarizerModelId: 'claude-3-opus',
    providerStatus: {
      openai: 'API key required',
      anthropic: 'Ready',
      google: 'API key required',
      xai: 'API key required',
    },
    onModelToggle: (modelId: string) => console.log('Toggle model:', modelId),
    onSummarizerChange: (modelId: string) => console.log('Set summarizer:', modelId),
  },
};

// No selections
export const NoSelection: Story = {
  args: {
    models: mockModels,
    selectedModelIds: [],
    summarizerModelId: undefined,
    providerStatus: {
      openai: 'API key required',
      anthropic: 'Ready',
      google: 'API key required',
      xai: 'API key required',
    },
    onModelToggle: (modelId: string) => console.log('Toggle model:', modelId),
    onSummarizerChange: (modelId: string) => console.log('Set summarizer:', modelId),
  },
};

// 3 models selected
export const ThreeSelected: Story = {
  args: {
    models: mockModels,
    selectedModelIds: ['gpt-4', 'claude-3-opus', 'gemini-pro'],
    summarizerModelId: 'claude-3-opus',
    onModelToggle: (modelId: string) => console.log('Toggle model:', modelId),
    onSummarizerChange: (modelId: string) => console.log('Set summarizer:', modelId),
  },
};

// 6 models selected (max)
export const SixSelected: Story = {
  args: {
    models: mockModels,
    selectedModelIds: [
      'gpt-4',
      'gpt-4-turbo',
      'claude-3-opus',
      'claude-3-sonnet',
      'gemini-pro',
      'grok-1',
    ],
    summarizerModelId: 'claude-3-opus',
    maxSelection: 6,
    onModelToggle: (modelId: string) => console.log('Toggle model:', modelId),
    onSummarizerChange: (modelId: string) => console.log('Set summarizer:', modelId),
  },
};

// Filter by OpenAI
export const OpenAIOnly: Story = {
  args: {
    models: mockModels.filter((m) => m.provider === 'openai'),
    selectedModelIds: ['gpt-4'],
    summarizerModelId: undefined,
    onModelToggle: (modelId: string) => console.log('Toggle model:', modelId),
    onSummarizerChange: (modelId: string) => console.log('Set summarizer:', modelId),
  },
};

// Filter by Anthropic
export const AnthropicOnly: Story = {
  args: {
    models: mockModels.filter((m) => m.provider === 'anthropic'),
    selectedModelIds: ['claude-3-opus', 'claude-3-sonnet'],
    summarizerModelId: 'claude-3-opus',
    onModelToggle: (modelId: string) => console.log('Toggle model:', modelId),
    onSummarizerChange: (modelId: string) => console.log('Set summarizer:', modelId),
  },
};

// Filter by Google
export const GoogleOnly: Story = {
  args: {
    models: mockModels.filter((m) => m.provider === 'google'),
    selectedModelIds: ['gemini-pro'],
    summarizerModelId: undefined,
    onModelToggle: (modelId: string) => console.log('Toggle model:', modelId),
    onSummarizerChange: (modelId: string) => console.log('Set summarizer:', modelId),
  },
};

// Filter by XAI
export const XAIOnly: Story = {
  args: {
    models: mockModels.filter((m) => m.provider === 'xai'),
    selectedModelIds: [],
    summarizerModelId: undefined,
    onModelToggle: (modelId: string) => console.log('Toggle model:', modelId),
    onSummarizerChange: (modelId: string) => console.log('Set summarizer:', modelId),
  },
};

// Max selection reached
export const MaxSelectionReached: Story = {
  args: {
    models: mockModels,
    selectedModelIds: ['gpt-4', 'claude-3-opus', 'gemini-pro'],
    summarizerModelId: 'claude-3-opus',
    maxSelection: 3,
    onModelToggle: (modelId: string) => console.log('Toggle model:', modelId),
    onSummarizerChange: (modelId: string) => console.log('Set summarizer:', modelId),
  },
};

// Interactive example
export const Interactive: Story = {
  args: {
    models: mockModels,
    maxSelection: 6,
  },
  render: function Render(args) {
    const [selectedModelIds, setSelectedModelIds] = React.useState<string[]>([]);
    const [summarizerModelId, setSummarizerModelId] = React.useState<string | undefined>(
      undefined
    );
    const [providerFilter, setProviderFilter] = React.useState<
      'all' | 'openai' | 'anthropic' | 'google' | 'xai'
    >('all');

    const handleModelToggle = (modelId: string) => {
      setSelectedModelIds((prev) => {
        const isSelected = prev.includes(modelId);
        if (isSelected) {
          // Deselecting - remove from selection and clear summarizer if it was the summarizer
          if (summarizerModelId === modelId) {
            setSummarizerModelId(undefined);
          }
          return prev.filter((id) => id !== modelId);
        } else {
          // Selecting - check max limit
          if (args.maxSelection && prev.length >= args.maxSelection) {
            return prev;
          }
          return [...prev, modelId];
        }
      });
    };

    const handleSummarizerChange = (modelId: string) => {
      setSummarizerModelId(modelId);
    };

    const filteredModels =
      providerFilter === 'all'
        ? args.models
        : args.models.filter((m) => m.provider === providerFilter);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium">Filter by provider:</div>
          <div className="flex gap-2">
            {['all', 'openai', 'anthropic', 'google', 'xai'].map((filter) => (
              <button
                key={filter}
                onClick={() =>
                  setProviderFilter(filter as 'all' | 'openai' | 'anthropic' | 'google' | 'xai')
                }
                className={`px-3 py-1 text-sm rounded border ${
                  providerFilter === filter
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Selected: {selectedModelIds.length} / {args.maxSelection || '∞'}
          {summarizerModelId && ` | Summarizer: ${summarizerModelId}`}
        </div>

        <ModelSelectionList
          models={filteredModels}
          selectedModelIds={selectedModelIds}
          summarizerModelId={summarizerModelId}
          maxSelection={args.maxSelection}
          onModelToggle={handleModelToggle}
          onSummarizerChange={handleSummarizerChange}
        />
      </div>
    );
  },
};
