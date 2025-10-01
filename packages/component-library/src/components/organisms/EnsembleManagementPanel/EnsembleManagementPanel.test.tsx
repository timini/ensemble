import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnsembleManagementPanel } from './EnsembleManagementPanel';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

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

describe('EnsembleManagementPanel', () => {
  describe('rendering', () => {
    it('renders preset list', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      expect(screen.getByText('Research Synthesis')).toBeInTheDocument();
      expect(screen.getByText('Rapid Drafting')).toBeInTheDocument();
      expect(screen.getByText('Balanced Perspective')).toBeInTheDocument();
    });

    it('renders preset descriptions', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      expect(
        screen.getByText(/Deep reasoning stack mixing GPT-4, Claude, and Gemini/)
      ).toBeInTheDocument();
    });

    it('renders summarizer information', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      expect(screen.getByText(/Summarizer: Claude 3.5 Sonnet/)).toBeInTheDocument();
      expect(screen.getByText(/Summarizer: GPT-4o Mini/)).toBeInTheDocument();
      expect(screen.getByText('Summarizer: GPT-4o')).toBeInTheDocument();
    });

    it('renders empty state when no presets', () => {
      render(
        <EnsembleManagementPanel
          presets={[]}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      expect(screen.getByText(/No saved presets yet/)).toBeInTheDocument();
    });

    it('renders quick presets section', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      expect(screen.getByText('Quick presets')).toBeInTheDocument();
    });

    it('renders save current ensemble section', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      expect(screen.getByText('Save current ensemble')).toBeInTheDocument();
    });
  });

  describe('load preset', () => {
    it('calls onLoadPreset when use preset button is clicked', async () => {
      const user = userEvent.setup();
      const onLoadPreset = vi.fn();

      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={onLoadPreset}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const useButtons = screen.getAllByText('Use preset');
      await user.click(useButtons[0]);

      expect(onLoadPreset).toHaveBeenCalledWith('research-synthesis');
    });

    it('loads correct preset based on button index', async () => {
      const user = userEvent.setup();
      const onLoadPreset = vi.fn();

      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={onLoadPreset}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const useButtons = screen.getAllByText('Use preset');
      await user.click(useButtons[1]); // Click second preset

      expect(onLoadPreset).toHaveBeenCalledWith('rapid-drafting');
    });

    it('renders all use preset buttons', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const useButtons = screen.getAllByText('Use preset');
      expect(useButtons).toHaveLength(mockPresets.length);
    });
  });

  describe('save preset', () => {
    it('calls onSavePreset when save button is clicked', async () => {
      const user = userEvent.setup();
      const onSavePreset = vi.fn();

      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName="My Custom Ensemble"
          onLoadPreset={vi.fn()}
          onSavePreset={onSavePreset}
          onDeletePreset={vi.fn()}
        />
      );

      const saveButton = screen.getByText('Save Ensemble');
      await user.click(saveButton);

      expect(onSavePreset).toHaveBeenCalledWith('My Custom Ensemble');
    });

    it('allows typing in ensemble name input', async () => {
      const user = userEvent.setup();

      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/e.g. Research Ensemble/);
      await user.type(input, 'My New Ensemble');

      await waitFor(() => {
        expect(input).toHaveValue('My New Ensemble');
      });
    });

    it('displays current ensemble name in input', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName="Existing Name"
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/e.g. Research Ensemble/);
      expect(input).toHaveValue('Existing Name');
    });

    it('renders save button', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      expect(screen.getByText('Save Ensemble')).toBeInTheDocument();
    });
  });

  describe('delete preset', () => {
    it('calls onDeletePreset when delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDeletePreset = vi.fn();

      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          showDeleteButtons={true}
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={onDeletePreset}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/Delete preset/);
      await user.click(deleteButtons[0]);

      expect(onDeletePreset).toHaveBeenCalledWith('research-synthesis');
    });

    it('deletes correct preset based on button index', async () => {
      const user = userEvent.setup();
      const onDeletePreset = vi.fn();

      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          showDeleteButtons={true}
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={onDeletePreset}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/Delete preset/);
      await user.click(deleteButtons[1]); // Click second delete button

      expect(onDeletePreset).toHaveBeenCalledWith('rapid-drafting');
    });

    it('does not render delete buttons when showDeleteButtons is false', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          showDeleteButtons={false}
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const deleteButtons = screen.queryAllByLabelText(/Delete preset/);
      expect(deleteButtons).toHaveLength(0);
    });

    it('renders delete buttons when showDeleteButtons is true', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          showDeleteButtons={true}
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const deleteButtons = screen.getAllByLabelText(/Delete preset/);
      expect(deleteButtons).toHaveLength(mockPresets.length);
    });
  });

  describe('layout', () => {
    it('organizes presets in a list', () => {
      const { container } = render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const presetList = container.querySelector('.space-y-3');
      expect(presetList).toBeInTheDocument();
    });

    it('has proper spacing between sections', () => {
      const { container } = render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const sections = container.querySelectorAll('.mb-6');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('has proper button roles for use preset', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const useButtons = screen.getAllByText('Use preset');
      useButtons.forEach((button) => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('has proper button role for save ensemble', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const saveButton = screen.getByText('Save Ensemble');
      expect(saveButton.tagName).toBe('BUTTON');
    });

    it('has accessible label for ensemble name input', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      expect(screen.getByText('Ensemble Name')).toBeInTheDocument();
    });
  });

  describe('composition', () => {
    it('composes Button components', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('composes Input component', () => {
      render(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/e.g. Research Ensemble/);
      expect(input).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English text correctly', () => {
      renderWithI18n(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />,
        { language: 'en' }
      );

      expect(screen.getByText('Quick presets')).toBeInTheDocument();
      expect(screen.getByText('Save current ensemble')).toBeInTheDocument();
      const usePresetButtons = screen.getAllByText('Use preset');
      expect(usePresetButtons.length).toBeGreaterThan(0);
      expect(screen.getByText('Save Ensemble')).toBeInTheDocument();
    });

    it('renders French text correctly', () => {
      renderWithI18n(
        <EnsembleManagementPanel
          presets={mockPresets}
          currentEnsembleName=""
          onLoadPreset={vi.fn()}
          onSavePreset={vi.fn()}
          onDeletePreset={vi.fn()}
        />,
        { language: 'fr' }
      );

      expect(screen.getByText('Préréglages rapides')).toBeInTheDocument();
      expect(screen.getByText('Enregistrer l\'ensemble actuel')).toBeInTheDocument();
      const usePresetButtons = screen.getAllByText('Utiliser le préréglage');
      expect(usePresetButtons.length).toBeGreaterThan(0);
      expect(screen.getByText('Enregistrer l\'Ensemble')).toBeInTheDocument();
    });
  });
});
