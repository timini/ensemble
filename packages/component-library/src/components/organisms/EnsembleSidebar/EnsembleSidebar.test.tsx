import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnsembleSidebar } from './EnsembleSidebar';

const mockSelectedModels = [
  { id: 'claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'gpt-4o', name: 'GPT-4o' },
];

const mockPresets = [
  {
    id: 'preset-1',
    name: 'Research Synthesis',
    description: 'Deep reasoning stack mixing GPT-4, Claude, and Gemini.',
    modelIds: ['gpt-4o', 'claude-3-opus', 'gemini-pro'],
    summarizerId: 'claude-3-opus',
    summarizerName: 'Claude 3.5 Sonnet',
  },
  {
    id: 'preset-2',
    name: 'Rapid Drafting',
    description: 'Fast, budget-friendly models.',
    modelIds: ['gpt-4o-mini', 'claude-haiku'],
    summarizerId: 'gpt-4o-mini',
    summarizerName: 'GPT-4o Mini',
  },
];

describe('EnsembleSidebar', () => {
  describe('rendering', () => {
    it('renders ensemble summary section', () => {
      render(
        <EnsembleSidebar
          selectedModels={mockSelectedModels}
          summarizerId="claude-3-opus"
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Ensemble Summary')).toBeInTheDocument();
      expect(
        screen.getByText('Review your current selections before saving or continuing.')
      ).toBeInTheDocument();
    });

    it('renders selected models section', () => {
      render(
        <EnsembleSidebar
          selectedModels={mockSelectedModels}
          summarizerId="claude-3-opus"
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Selected Models (2)')).toBeInTheDocument();
      expect(screen.getByText('Summarizer')).toBeInTheDocument();
    });

    it('renders quick presets section', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Quick presets')).toBeInTheDocument();
      expect(
        screen.getByText('Start from a curated ensemble tuned for common workflows.')
      ).toBeInTheDocument();
    });

    it('renders save ensemble section', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Save current ensemble')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. Research Ensemble')).toBeInTheDocument();
    });

    it('renders manual responses section', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Manual Responses')).toBeInTheDocument();
      expect(screen.getByText('Add Manual Response')).toBeInTheDocument();
    });
  });

  describe('selected models', () => {
    it('displays all selected models', () => {
      render(
        <EnsembleSidebar
          selectedModels={mockSelectedModels}
          summarizerId="claude-3-opus"
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      // Claude 3 Opus appears twice (model name + badge)
      const claudeElements = screen.getAllByText('Claude 3 Opus');
      expect(claudeElements.length).toBe(2);
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    });

    it('shows count of selected models', () => {
      render(
        <EnsembleSidebar
          selectedModels={mockSelectedModels}
          summarizerId="claude-3-opus"
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Selected Models (2)')).toBeInTheDocument();
    });

    it('shows summarizer badge on correct model', () => {
      render(
        <EnsembleSidebar
          selectedModels={mockSelectedModels}
          summarizerId="claude-3-opus"
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      // Badge should show summarizer model name
      const badges = screen.getAllByText('Claude 3 Opus');
      expect(badges.length).toBe(2); // model name + badge
    });

    it('shows empty state when no models selected', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('No models selected yet')).toBeInTheDocument();
    });
  });

  describe('presets', () => {
    it('renders all presets', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Research Synthesis')).toBeInTheDocument();
      expect(screen.getByText('Rapid Drafting')).toBeInTheDocument();
    });

    it('renders preset descriptions', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(
        screen.getByText('Deep reasoning stack mixing GPT-4, Claude, and Gemini.')
      ).toBeInTheDocument();
    });

    it('renders preset summarizer names', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Summarizer: Claude 3.5 Sonnet')).toBeInTheDocument();
      expect(screen.getByText('Summarizer: GPT-4o Mini')).toBeInTheDocument();
    });

    it('shows empty state when no presets', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(
        screen.getByText('No saved presets yet. Save your first ensemble below to get started.')
      ).toBeInTheDocument();
    });

    it('renders Use preset buttons', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      const useButtons = screen.getAllByText('Use preset');
      expect(useButtons).toHaveLength(2);
    });

    it('shows delete buttons when enabled', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          showDeleteButtons={true}
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Delete preset Research Synthesis')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete preset Rapid Drafting')).toBeInTheDocument();
    });

    it('hides delete buttons by default', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.queryByLabelText('Delete preset Research Synthesis')).not.toBeInTheDocument();
    });
  });

  describe('save ensemble', () => {
    it('renders ensemble name input', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText('e.g. Research Ensemble');
      expect(input).toBeInTheDocument();
    });

    it('populates input with current ensemble name', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName="My Ensemble"
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText('e.g. Research Ensemble') as HTMLInputElement;
      expect(input.value).toBe('My Ensemble');
    });

    it('renders save button', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Save Ensemble')).toBeInTheDocument();
    });

    it('disables save button when name is empty', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      const saveButton = screen.getByText('Save Ensemble');
      expect(saveButton).toBeDisabled();
    });

    it('shows info box about saving', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(
        screen.getByText('Save your favourite model combinations to load them instantly later.')
      ).toBeInTheDocument();
    });
  });

  describe('manual responses', () => {
    it('renders add button', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Add Manual Response')).toBeInTheDocument();
    });

    it('shows description text', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(
        screen.getByText(
          'Add reference answers or benchmark outputs to include in the review step.'
        )
      ).toBeInTheDocument();
    });

    it('shows info box', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(
        screen.getByText(
          'Add reference answers or benchmark outputs to compare against live model responses.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onLoadPreset when Use preset clicked', async () => {
      const user = userEvent.setup();
      const onLoadPreset = vi.fn();

      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={onLoadPreset}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      const useButtons = screen.getAllByText('Use preset');
      await user.click(useButtons[0]);

      expect(onLoadPreset).toHaveBeenCalledWith('preset-1');
    });

    it('calls onDeletePreset when delete clicked', async () => {
      const user = userEvent.setup();
      const onDeletePreset = vi.fn();

      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          showDeleteButtons={true}
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={onDeletePreset}
          onAddManualResponse={vi.fn()}
        />
      );

      const deleteButton = screen.getByLabelText('Delete preset Research Synthesis');
      await user.click(deleteButton);

      expect(onDeletePreset).toHaveBeenCalledWith('preset-1');
    });

    it('calls onSavePreset when save clicked with name', async () => {
      const user = userEvent.setup();
      const onSavePreset = vi.fn();

      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={onSavePreset}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText('e.g. Research Ensemble');
      await user.type(input, 'My New Ensemble');

      const saveButton = screen.getByText('Save Ensemble');
      await user.click(saveButton);

      expect(onSavePreset).toHaveBeenCalledWith('My New Ensemble');
    });

    it('trims whitespace from ensemble name', async () => {
      const user = userEvent.setup();
      const onSavePreset = vi.fn();

      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={onSavePreset}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText('e.g. Research Ensemble');
      await user.type(input, '  Ensemble Name  ');

      const saveButton = screen.getByText('Save Ensemble');
      await user.click(saveButton);

      expect(onSavePreset).toHaveBeenCalledWith('Ensemble Name');
    });

    it('calls onAddManualResponse when button clicked', async () => {
      const user = userEvent.setup();
      const onAddManualResponse = vi.fn();

      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={onAddManualResponse}
        />
      );

      const addButton = screen.getByText('Add Manual Response');
      await user.click(addButton);

      expect(onAddManualResponse).toHaveBeenCalled();
    });
  });

  describe('layout', () => {
    it('uses Card component', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      const sidebar = screen.getByTestId('ensemble-sidebar');
      expect(sidebar).toBeInTheDocument();
    });

    it('has sticky positioning class', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      const sidebar = screen.getByTestId('ensemble-sidebar');
      expect(sidebar).toHaveClass('sticky');
    });
  });

  describe('accessibility', () => {
    it('uses semantic structure', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      // Should have multiple headings
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('provides aria labels for delete buttons', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={mockPresets}
          currentEnsembleName=""
          showDeleteButtons={true}
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Delete preset Research Synthesis')).toBeInTheDocument();
    });

    it('labels ensemble name input', () => {
      render(
        <EnsembleSidebar
          selectedModels={[]}
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
          onAddManualResponse={vi.fn()}
        />
      );

      expect(screen.getByText('Ensemble Name')).toBeInTheDocument();
    });
  });
});
