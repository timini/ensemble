import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnsembleConfigurationSummary } from './EnsembleConfigurationSummary';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const mockSelectedModels = [
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229',
  'gpt-4-turbo',
];
const mockSummarizerModel = 'claude-3-opus-20240229';

describe('EnsembleConfigurationSummary', () => {
  describe('rendering', () => {
    it('renders the default heading', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByText('Your Ensemble Configuration')).toBeInTheDocument();
    });

    it('renders custom heading', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          heading="Custom Heading"
        />
      );

      expect(screen.getByText('Custom Heading')).toBeInTheDocument();
    });

    it('renders the default description', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(
        screen.getByText('These models will receive the prompt and contribute to the comparison.')
      ).toBeInTheDocument();
    });

    it('renders custom description', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          description="Custom description text"
        />
      );

      expect(screen.getByText('Custom description text')).toBeInTheDocument();
    });

    it('renders with testid', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByTestId('ensemble-configuration-summary')).toBeInTheDocument();
    });
  });

  describe('selected models', () => {
    it('displays the correct count of selected models', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByText('Selected Models (3)')).toBeInTheDocument();
    });

    it('renders all selected model badges', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByText('claude-3-haiku-20240307')).toBeInTheDocument();
      // claude-3-opus-20240229 appears in both selected models and summarizer
      expect(screen.getAllByText('claude-3-opus-20240229')).toHaveLength(2);
      expect(screen.getByText('gpt-4-turbo')).toBeInTheDocument();
    });

    it('renders selected models with correct styling', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByTestId('selected-model-0')).toBeInTheDocument();
      expect(screen.getByTestId('selected-model-1')).toBeInTheDocument();
      expect(screen.getByTestId('selected-model-2')).toBeInTheDocument();
    });

    it('handles single selected model', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={['claude-3-haiku-20240307']}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByText('Selected Models (1)')).toBeInTheDocument();
      expect(screen.getByText('claude-3-haiku-20240307')).toBeInTheDocument();
    });

    it('handles many selected models', () => {
      const manyModels = [
        'claude-3-haiku-20240307',
        'claude-3-opus-20240229',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'gemini-pro',
      ];

      render(
        <EnsembleConfigurationSummary
          selectedModels={manyModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByText('Selected Models (5)')).toBeInTheDocument();
      // Check each model appears (some may appear twice if they're also the summarizer)
      expect(screen.getByText('claude-3-haiku-20240307')).toBeInTheDocument();
      expect(screen.getAllByText('claude-3-opus-20240229')).toHaveLength(2); // also summarizer
      expect(screen.getByText('gpt-4-turbo')).toBeInTheDocument();
      expect(screen.getByText('gpt-3.5-turbo')).toBeInTheDocument();
      expect(screen.getByText('gemini-pro')).toBeInTheDocument();
    });

    it('renders all selected model badges in layout', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByTestId('selected-model-0')).toHaveTextContent('claude-3-haiku-20240307');
      expect(screen.getByTestId('selected-model-1')).toHaveTextContent('claude-3-opus-20240229');
      expect(screen.getByTestId('selected-model-2')).toHaveTextContent('gpt-4-turbo');
    });
  });

  describe('summarizer model', () => {
    it('displays summarizer label', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByText('Summarizer')).toBeInTheDocument();
    });

    it('displays summarizer model', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const summarizerBadge = screen.getByTestId('summarizer-model');
      expect(summarizerBadge).toHaveTextContent('claude-3-opus-20240229');
    });

    it('renders summarizer badge', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const summarizerBadge = screen.getByTestId('summarizer-model');
      expect(summarizerBadge).toBeInTheDocument();
    });

    it('handles different summarizer model', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel="gpt-4-turbo"
        />
      );

      const summarizerBadge = screen.getByTestId('summarizer-model');
      expect(summarizerBadge).toHaveTextContent('gpt-4-turbo');
    });
  });

  describe('layout', () => {
    it('renders in a card', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByTestId('ensemble-configuration-summary')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has semantic heading structure', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const mainHeading = screen.getByRole('heading', { level: 3, name: /Your Ensemble Configuration/i });
      expect(mainHeading).toBeInTheDocument();
    });

    it('has subheadings for sections', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const subheadings = screen.getAllByRole('heading', { level: 4 });
      expect(subheadings).toHaveLength(2);
      expect(subheadings[0]).toHaveTextContent('Selected Models (3)');
      expect(subheadings[1]).toHaveTextContent('Summarizer');
    });

    it('provides descriptive text', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const description = screen.getByText(/These models will receive the prompt/i);
      expect(description.tagName).toBe('P');
    });
  });

  describe('styling', () => {
    it('renders heading as h3', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Your Ensemble Configuration');
    });

    it('renders description as paragraph', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const description = screen.getByText(/These models will receive the prompt/i);
      expect(description.tagName).toBe('P');
    });

    it('renders subheadings as h4', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const subheadings = screen.getAllByRole('heading', { level: 4 });
      expect(subheadings).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('handles empty selected models array gracefully', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={[]}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByText('Selected Models (0)')).toBeInTheDocument();
    });

    it('handles very long model names', () => {
      const longModelName = 'very-long-model-name-that-might-wrap-to-multiple-lines-in-the-ui';

      render(
        <EnsembleConfigurationSummary
          selectedModels={[longModelName]}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByText(longModelName)).toBeInTheDocument();
    });

    it('handles special characters in model names', () => {
      const specialModel = 'model-name_with@special#characters';

      render(
        <EnsembleConfigurationSummary
          selectedModels={[specialModel]}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByText(specialModel)).toBeInTheDocument();
    });
  });

  describe('dark mode (semantic tokens)', () => {
    it('renders description text', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const description = screen.getByText(/These models will receive/i);
      expect(description).toBeInTheDocument();
    });

    it('renders model badges', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      expect(screen.getByTestId('selected-model-0')).toBeInTheDocument();
      expect(screen.getByTestId('selected-model-1')).toBeInTheDocument();
      expect(screen.getByTestId('selected-model-2')).toBeInTheDocument();
    });

    it('renders summarizer badge', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const badge = screen.getByTestId('summarizer-model');
      expect(badge).toBeInTheDocument();
    });

    it('renders warning text for ELO requirement', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={['model-1', 'model-2']}
          summarizerModel={mockSummarizerModel}
          onConsensusMethodChange={() => {}}
        />
      );

      const warning = screen.getByText(/ELO and Council require at least 3 models/i);
      expect(warning).toBeInTheDocument();
    });

    it('renders number input for ELO mode', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          consensusMethod="elo"
          onConsensusMethodChange={() => {}}
          onTopNChange={() => {}}
        />
      );

      const input = screen.getByTestId('input-top-n');
      expect(input).toBeInTheDocument();
    });
  });

  describe('consensus presets', () => {
    it('renders majority voting option when consensus controls are enabled', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          onConsensusMethodChange={() => {}}
        />
      );

      expect(screen.getByTestId('preset-standard')).toBeInTheDocument();
      expect(screen.getByTestId('preset-elo')).toBeInTheDocument();
      expect(screen.getByTestId('preset-majority')).toBeInTheDocument();
      expect(
        screen.getByText('Favors the majority position across responses. Works with 2+ models.')
      ).toBeInTheDocument();
    });

    it('calls onConsensusMethodChange with majority when selected', async () => {
      const handleConsensusMethodChange = vi.fn();
      const user = userEvent.setup();

      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          onConsensusMethodChange={handleConsensusMethodChange}
        />
      );

      await user.click(screen.getByTestId('preset-majority'));

      expect(handleConsensusMethodChange).toHaveBeenCalledWith('majority');
    });

    it('shows Top N input for elo only', () => {
      const { rerender } = render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          consensusMethod="majority"
          onConsensusMethodChange={() => {}}
          onTopNChange={() => {}}
        />
      );

      expect(screen.queryByTestId('input-top-n')).not.toBeInTheDocument();

      rerender(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          consensusMethod="elo"
          onConsensusMethodChange={() => {}}
          onTopNChange={() => {}}
        />
      );

      expect(screen.getByTestId('input-top-n')).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English text', () => {
      renderWithI18n(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />,
        { language: 'en' }
      );
      expect(screen.getByText('Your Ensemble Configuration')).toBeInTheDocument();
      expect(screen.getByText('These models will receive the prompt and contribute to the comparison.')).toBeInTheDocument();
      expect(screen.getByText('Selected Models (3)')).toBeInTheDocument();
      expect(screen.getByText('Summarizer')).toBeInTheDocument();
    });

    it('renders French text', () => {
      renderWithI18n(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />,
        { language: 'fr' }
      );
      expect(screen.getByText('Configuration de Votre Ensemble')).toBeInTheDocument();
      expect(screen.getByText('Ces modèles recevront l\'invite et contribueront à la comparaison.')).toBeInTheDocument();
      expect(screen.getByText('Modèles Sélectionnés (3)')).toBeInTheDocument();
      expect(screen.getByText('Synthétiseur')).toBeInTheDocument();
    });
  });

  describe('interactive summarizer selection', () => {
    it('wraps badges in buttons when onSummarizerChange is provided', () => {
      const handleChange = vi.fn();
      renderWithI18n(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          onSummarizerChange={handleChange}
        />,
        { language: 'en' }
      );

      // Each selected model should have a button wrapper
      mockSelectedModels.forEach((model) => {
        expect(
          screen.getByRole('button', { name: new RegExp(`set ${model} as summarizer`, 'i') })
        ).toBeInTheDocument();
      });
    });

    it('invokes callback with correct model ID when badge is clicked', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      renderWithI18n(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          onSummarizerChange={handleChange}
        />,
        { language: 'en' }
      );

      const firstModelButton = screen.getByRole('button', {
        name: /set claude-3-haiku-20240307 as summarizer/i,
      });
      await user.click(firstModelButton);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('claude-3-haiku-20240307');
    });

    it('allows clicking current summarizer', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      renderWithI18n(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          onSummarizerChange={handleChange}
        />,
        { language: 'en' }
      );

      const summarizerButton = screen.getByRole('button', {
        name: /set claude-3-opus-20240229 as summarizer/i,
      });
      await user.click(summarizerButton);

      expect(handleChange).toHaveBeenCalledWith('claude-3-opus-20240229');
    });

    it('wraps non-summarizer badges in clickable buttons', () => {
      const handleChange = vi.fn();
      renderWithI18n(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          onSummarizerChange={handleChange}
        />,
        { language: 'en' }
      );

      const nonSummarizerBadge = screen.getByTestId('selected-model-0');
      expect(nonSummarizerBadge.closest('button')).toBeInTheDocument();
    });

    it('wraps current summarizer badge in clickable button', () => {
      const handleChange = vi.fn();
      renderWithI18n(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          onSummarizerChange={handleChange}
        />,
        { language: 'en' }
      );

      // The summarizer model is 'claude-3-opus-20240229' which is at index 1
      const summarizerBadge = screen.getByTestId('selected-model-1');
      expect(summarizerBadge.closest('button')).toBeInTheDocument();
    });

    it('remains static when onSummarizerChange is not provided', () => {
      renderWithI18n(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />,
        { language: 'en' }
      );

      // Should NOT have clickable button wrappers for model badges
      const buttons = screen.queryAllByRole('button', {
        name: /set .+ as summarizer/i,
      });
      expect(buttons).toHaveLength(0);
    });

    it('supports keyboard activation', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      renderWithI18n(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
          onSummarizerChange={handleChange}
        />,
        { language: 'en' }
      );

      const firstButton = screen.getByRole('button', {
        name: /set claude-3-haiku-20240307 as summarizer/i,
      });
      firstButton.focus();
      await user.keyboard('{Enter}');

      expect(handleChange).toHaveBeenCalledWith('claude-3-haiku-20240307');
    });
  });
});
