import type { Meta, StoryObj } from '@storybook/react';
import { EnsembleSidebar } from './EnsembleSidebar';

const meta = {
  title: 'Organisms/EnsembleSidebar',
  component: EnsembleSidebar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onLoadPreset: () => { },
    onSavePreset: () => { },
    onDeletePreset: () => { },
    onAddManualResponse: () => { },
    onClearAll: () => { },
    onRemoveModel: (modelId: string) => { console.log('Remove model:', modelId); },
  },
} satisfies Meta<typeof EnsembleSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSelectedModels = [
  { id: 'claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
];

const mockPresets = [
  {
    id: 'preset-1',
    name: 'Research Synthesis',
    description: 'Flagship models from Anthropic, OpenAI and Google for in-depth analysis.',
    modelIds: ['claude-opus-5-5', 'gpt-6-astra', 'gemini-4-carbon'],
    summarizerId: 'claude-opus-5-5',
    summarizerName: 'Claude Opus 5.5',
  },
  {
    id: 'preset-2',
    name: 'Rapid Drafting',
    description: 'Fast, low-cost models for quick ideation and iteration.',
    modelIds: ['gpt-6-luna', 'claude-haiku-5-5', 'gemini-3.5-flash-lite', 'deepseek-flash'],
    summarizerId: 'gpt-6-luna',
    summarizerName: 'GPT-6 Luna',
  },
  {
    id: 'preset-3',
    name: 'Balanced Perspective',
    description: 'Mid-priced models from four providers for contrasting opinions and concise summaries.',
    modelIds: ['claude-sonnet-5-5', 'gemini-4-hydrogen', 'grok-4.7', 'deepseek-v4-pro'],
    summarizerId: 'claude-sonnet-5-5',
    summarizerName: 'Claude Sonnet 5.5',
  },
];

// Complete sidebar with all sections populated
export const Complete: Story = {
  args: {
    selectedModels: mockSelectedModels,
    summarizerId: 'claude-3-opus',
    presets: mockPresets,
    currentEnsembleName: '',
  },
};

// Sidebar with selected models but no presets
export const WithModelsNoPresets: Story = {
  args: {
    selectedModels: mockSelectedModels,
    summarizerId: 'claude-3-opus',
    presets: [],
    currentEnsembleName: '',
  },
};

// Empty sidebar - no models, no presets
export const Empty: Story = {
  args: {
    selectedModels: [],
    presets: [],
    currentEnsembleName: '',
  },
};

// Sidebar with preset name filled in
export const WithPresetName: Story = {
  args: {
    selectedModels: mockSelectedModels,
    summarizerId: 'claude-3-opus',
    presets: mockPresets,
    currentEnsembleName: 'My Research Ensemble',
  },
};

// Sidebar with delete buttons enabled
export const WithDeleteButtons: Story = {
  args: {
    selectedModels: mockSelectedModels,
    summarizerId: 'claude-3-opus',
    presets: mockPresets,
    currentEnsembleName: '',
    showDeleteButtons: true,
  },
};

// Sidebar with many models selected
export const ManyModelsSelected: Story = {
  args: {
    selectedModels: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'gemini-pro', name: 'Gemini 1.5 Pro' },
    ],
    summarizerId: 'claude-3-opus',
    presets: mockPresets,
    currentEnsembleName: '',
  },
};

// Sidebar with single preset
export const SinglePreset: Story = {
  args: {
    selectedModels: mockSelectedModels,
    summarizerId: 'claude-3-opus',
    presets: [mockPresets[0]],
    currentEnsembleName: '',
  },
};

// Dark mode
export const DarkMode: Story = {
  args: {
    selectedModels: mockSelectedModels,
    summarizerId: 'claude-3-opus',
    presets: mockPresets,
    currentEnsembleName: 'My Research Ensemble',
    showDeleteButtons: true,
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

// Sidebar with no summarizer selected
export const NoSummarizer: Story = {
  args: {
    selectedModels: mockSelectedModels,
    presets: mockPresets,
    currentEnsembleName: '',
  },
};

// Sidebar with continue button enabled
export const WithContinueButton: Story = {
  args: {
    selectedModels: mockSelectedModels,
    summarizerId: 'claude-3-opus',
    presets: [],
    currentEnsembleName: '',
    showQuickPresets: false,
    showSaveEnsemble: false,
    onContinue: () => {},
    continueDisabled: false,
  },
};

// Sidebar with continue button disabled
export const ContinueButtonDisabled: Story = {
  args: {
    selectedModels: [],
    presets: [],
    currentEnsembleName: '',
    showQuickPresets: false,
    showSaveEnsemble: false,
    onContinue: () => {},
    continueDisabled: true,
  },
};

// Save disabled because no models are selected
export const SaveDisabled: Story = {
  args: {
    selectedModels: [],
    presets: mockPresets,
    currentEnsembleName: 'My ensemble',
    showDeleteButtons: true,
    saveDisabled: true,
  },
};
