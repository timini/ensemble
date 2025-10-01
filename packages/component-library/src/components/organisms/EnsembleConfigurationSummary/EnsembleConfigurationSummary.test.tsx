import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      const { container } = render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const badges = container.querySelectorAll('[data-testid^="selected-model-"]');
      expect(badges).toHaveLength(3);

      badges.forEach((badge) => {
        expect(badge).toHaveClass('bg-gray-50');
      });
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

    it('renders selected models in flex wrap layout', () => {
      const { container } = render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const modelsContainer = container.querySelector('.flex.flex-wrap.gap-2');
      expect(modelsContainer).toBeInTheDocument();
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

    it('renders summarizer with correct styling', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const summarizerBadge = screen.getByTestId('summarizer-model');
      expect(summarizerBadge).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
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
    it('uses flex layout for models and summarizer', () => {
      const { container } = render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const flexContainer = container.querySelector('.flex.items-center.justify-between');
      expect(flexContainer).toBeInTheDocument();
    });

    it('renders in a card', () => {
      const { container } = render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      // Card component adds specific classes
      const card = container.querySelector('.rounded-xl');
      expect(card).toBeInTheDocument();
    });

    it('applies correct padding to card content', () => {
      const { container } = render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const cardContent = container.querySelector('.p-6');
      expect(cardContent).toBeInTheDocument();
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
      expect(description).toHaveClass('text-sm', 'text-gray-600');
    });
  });

  describe('styling', () => {
    it('applies correct heading styling', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const heading = screen.getByText('Your Ensemble Configuration');
      expect(heading).toHaveClass('font-semibold', 'mb-4');
    });

    it('applies correct description styling', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const description = screen.getByText(/These models will receive the prompt/i);
      expect(description).toHaveClass('text-sm', 'text-gray-600', 'mb-4');
    });

    it('applies correct subheading styling', () => {
      render(
        <EnsembleConfigurationSummary
          selectedModels={mockSelectedModels}
          summarizerModel={mockSummarizerModel}
        />
      );

      const subheadings = screen.getAllByRole('heading', { level: 4 });
      subheadings.forEach((heading) => {
        expect(heading).toHaveClass('font-semibold', 'text-sm', 'mb-2');
      });
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
});
