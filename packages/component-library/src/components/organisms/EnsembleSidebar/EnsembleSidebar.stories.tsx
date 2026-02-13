import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
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
    description: 'Deep reasoning stack mixing GPT-4, Claude, and Gemini for comprehensive analysis.',
    modelIds: ['gpt-4o', 'claude-3-opus', 'gemini-pro'],
    summarizerId: 'claude-3-opus',
    summarizerName: 'Claude 3.5 Sonnet',
  },
  {
    id: 'preset-2',
    name: 'Rapid Drafting',
    description: 'Fast, budget-friendly models tuned for quick ideation and iteration.',
    modelIds: ['gpt-4o-mini', 'claude-haiku'],
    summarizerId: 'gpt-4o-mini',
    summarizerName: 'GPT-4o Mini',
  },
  {
    id: 'preset-3',
    name: 'Balanced Perspective',
    description: 'Balanced trio for contrasting opinions and concise summaries.',
    modelIds: ['gpt-4o', 'claude-3-opus', 'gemini-pro'],
    summarizerId: 'gpt-4o',
    summarizerName: 'GPT-4o',
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
    onContinue: action('onContinue'),
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
    onContinue: action('onContinue'),
    continueDisabled: true,
  },
};
