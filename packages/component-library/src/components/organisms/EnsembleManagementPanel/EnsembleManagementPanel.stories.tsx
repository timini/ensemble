import type { Meta, StoryObj } from '@storybook/react';
import { EnsembleManagementPanel } from './EnsembleManagementPanel';
import * as React from 'react';

const meta = {
  title: 'Organisms/EnsembleManagementPanel',
  component: EnsembleManagementPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    presets: {
      description: 'Array of available presets',
    },
    currentEnsembleName: {
      description: 'Name of the current ensemble being edited',
    },
    onLoadPreset: {
      description: 'Callback when a preset is loaded',
    },
    onSavePreset: {
      description: 'Callback when a preset is saved',
    },
    onDeletePreset: {
      description: 'Callback when a preset is deleted',
    },
  },
} satisfies Meta<typeof EnsembleManagementPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockPresets = [
  {
    id: 'research-synthesis',
    name: 'Research Synthesis',
    description: 'Deep reasoning stack mixing GPT-4, Claude, and Gemini for comprehensive analysis.',
    modelIds: ['gpt-4', 'claude-3-opus', 'gemini-pro'],
    summarizerId: 'claude-3-opus',
    summarizerName: 'Claude 3.5 Sonnet',
  },
  {
    id: 'rapid-drafting',
    name: 'Rapid Drafting',
    description: 'Fast, budget-friendly models tuned for quick ideation and iteration.',
    modelIds: ['gpt-3.5-turbo', 'claude-3-haiku', 'gemini-nano'],
    summarizerId: 'gpt-3.5-turbo',
    summarizerName: 'GPT-4o Mini',
  },
  {
    id: 'balanced-perspective',
    name: 'Balanced Perspective',
    description: 'Balanced trio for contrasting opinions and concise summaries.',
    modelIds: ['gpt-4-turbo', 'claude-3-sonnet', 'gemini-pro'],
    summarizerId: 'gpt-4-turbo',
    summarizerName: 'GPT-4o',
  },
];

// No presets
export const NoPresets: Story = {
  args: {
    presets: [],
    currentEnsembleName: '',
    onLoadPreset: (presetId: string) => console.log('Load preset:', presetId),
    onSavePreset: (name: string) => console.log('Save preset:', name),
    onDeletePreset: (presetId: string) => console.log('Delete preset:', presetId),
  },
};

// One preset
export const OnePreset: Story = {
  args: {
    presets: [mockPresets[0]],
    currentEnsembleName: '',
    onLoadPreset: (presetId: string) => console.log('Load preset:', presetId),
    onSavePreset: (name: string) => console.log('Save preset:', name),
    onDeletePreset: (presetId: string) => console.log('Delete preset:', presetId),
  },
};

// Five presets
export const FivePresets: Story = {
  args: {
    presets: [
      ...mockPresets,
      {
        id: 'creative-writing',
        name: 'Creative Writing',
        description: 'Models optimized for creative and narrative content.',
        modelIds: ['gpt-4', 'claude-3-opus'],
        summarizerId: 'claude-3-opus',
        summarizerName: 'Claude 3 Opus',
      },
      {
        id: 'code-review',
        name: 'Code Review',
        description: 'Technical models for code analysis and debugging.',
        modelIds: ['gpt-4-turbo', 'claude-3-sonnet', 'gemini-pro'],
        summarizerId: 'gpt-4-turbo',
        summarizerName: 'GPT-4 Turbo',
      },
    ],
    currentEnsembleName: '',
    onLoadPreset: (presetId: string) => console.log('Load preset:', presetId),
    onSavePreset: (name: string) => console.log('Save preset:', name),
    onDeletePreset: (presetId: string) => console.log('Delete preset:', presetId),
  },
};

// With current ensemble name
export const WithCurrentEnsemble: Story = {
  args: {
    presets: mockPresets,
    currentEnsembleName: 'My Custom Ensemble',
    onLoadPreset: (presetId: string) => console.log('Load preset:', presetId),
    onSavePreset: (name: string) => console.log('Save preset:', name),
    onDeletePreset: (presetId: string) => console.log('Delete preset:', presetId),
  },
};

// Interactive example
export const Interactive: Story = {
  args: {
    presets: mockPresets,
    currentEnsembleName: '',
    onLoadPreset: () => {},
    onSavePreset: () => {},
    onDeletePreset: () => {},
  },
  render: function Render(args) {
    const [presets, setPresets] = React.useState(args.presets);
    const [currentEnsembleName, setCurrentEnsembleName] = React.useState('');
    const [selectedPresetId, setSelectedPresetId] = React.useState<string | null>(null);

    const handleLoadPreset = (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        setCurrentEnsembleName(preset.name);
        setSelectedPresetId(presetId);
        console.log('Loaded preset:', preset);
      }
    };

    const handleSavePreset = (name: string) => {
      if (!name.trim()) {
        alert('Please enter a name for the ensemble');
        return;
      }

      const newPreset = {
        id: `preset-${Date.now()}`,
        name: name.trim(),
        description: 'Custom ensemble configuration',
        modelIds: ['gpt-4', 'claude-3-opus'], // Mock data
        summarizerId: 'claude-3-opus',
        summarizerName: 'Claude 3 Opus',
      };

      setPresets([...presets, newPreset]);
      setCurrentEnsembleName('');
      console.log('Saved preset:', newPreset);
    };

    const handleDeletePreset = (presetId: string) => {
      if (confirm('Are you sure you want to delete this preset?')) {
        setPresets(presets.filter((p) => p.id !== presetId));
        if (selectedPresetId === presetId) {
          setSelectedPresetId(null);
          setCurrentEnsembleName('');
        }
        console.log('Deleted preset:', presetId);
      }
    };

    return (
      <div className="space-y-6">
        <div className="text-sm text-muted-foreground">
          Presets: {presets.length} | Selected: {selectedPresetId || 'None'}
        </div>

        <EnsembleManagementPanel
          presets={presets}
          currentEnsembleName={currentEnsembleName}
          onLoadPreset={handleLoadPreset}
          onSavePreset={handleSavePreset}
          onDeletePreset={handleDeletePreset}
        />
      </div>
    );
  },
};

// With delete actions
export const WithDeleteActions: Story = {
  args: {
    presets: mockPresets,
    currentEnsembleName: '',
    showDeleteButtons: true,
    onLoadPreset: (presetId: string) => console.log('Load preset:', presetId),
    onSavePreset: (name: string) => console.log('Save preset:', name),
    onDeletePreset: (presetId: string) => console.log('Delete preset:', presetId),
  },
};

// Empty state for quick presets
export const EmptyQuickPresets: Story = {
  args: {
    presets: [],
    currentEnsembleName: 'My Ensemble',
    onLoadPreset: (presetId: string) => console.log('Load preset:', presetId),
    onSavePreset: (name: string) => console.log('Save preset:', name),
    onDeletePreset: (presetId: string) => console.log('Delete preset:', presetId),
  },
};
