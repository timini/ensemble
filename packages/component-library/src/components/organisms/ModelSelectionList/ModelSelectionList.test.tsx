import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelSelectionList } from './ModelSelectionList';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const mockModels = [
  { id: 'gpt-4', provider: 'openai' as const, name: 'GPT-4' },
  { id: 'gpt-4-turbo', provider: 'openai' as const, name: 'GPT-4 Turbo' },
  { id: 'claude-3-opus', provider: 'anthropic' as const, name: 'Claude 3 Opus' },
  { id: 'claude-3-sonnet', provider: 'anthropic' as const, name: 'Claude 3 Sonnet' },
  { id: 'gemini-pro', provider: 'google' as const, name: 'Gemini Pro' },
  { id: 'grok-1', provider: 'xai' as const, name: 'Grok 1' },
];

describe('ModelSelectionList', () => {
  describe('rendering', () => {
    it('renders multiple model cards', () => {
      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      expect(screen.getByText('GPT-4')).toBeInTheDocument();
      expect(screen.getByText('GPT-4 Turbo')).toBeInTheDocument();
      expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument();
      expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument();
      expect(screen.getByText('Gemini Pro')).toBeInTheDocument();
      expect(screen.getByText('Grok 1')).toBeInTheDocument();
    });

    it('renders provider sections', () => {
      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('XAI')).toBeInTheDocument();
    });

    it('groups models by provider', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      // Should have 4 provider sections (OpenAI, Anthropic, Google, XAI)
      const sections = container.querySelectorAll('[data-testid="provider-section"]');
      expect(sections).toHaveLength(4);
    });

    it('renders empty state when no models', () => {
      render(
        <ModelSelectionList
          models={[]}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      expect(screen.getByText('No models available')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('renders selected models with selected styling', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4', 'claude-3-opus']}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const gpt4Card = container.querySelector('[data-testid="model-card-gpt-4"]');
      expect(gpt4Card).toHaveAttribute('data-selected', 'true');
    });

    it('calls onModelToggle when model is clicked', async () => {
      const user = userEvent.setup();
      const onModelToggle = vi.fn();

      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={onModelToggle}
          onSummarizerChange={vi.fn()}
        />
      );

      await user.click(screen.getByText('GPT-4'));
      expect(onModelToggle).toHaveBeenCalledWith('gpt-4');
    });

    it('toggles selection state on click', async () => {
      const user = userEvent.setup();
      const onModelToggle = vi.fn();

      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4']}
          onModelToggle={onModelToggle}
          onSummarizerChange={vi.fn()}
        />
      );

      // Click already selected model to deselect
      await user.click(screen.getByText('GPT-4'));
      expect(onModelToggle).toHaveBeenCalledWith('gpt-4');
    });
  });

  describe('summarizer designation', () => {
    it('renders summarizer badge on designated model', () => {
      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['claude-3-opus']}
          summarizerModelId="claude-3-opus"
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      expect(screen.getByText('Summarizer')).toBeInTheDocument();
    });

    it('applies summarizer styling to designated model', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['claude-3-opus']}
          summarizerModelId="claude-3-opus"
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const summarizerCard = container.querySelector('[data-summarizer="true"]');
      expect(summarizerCard).toBeInTheDocument();
    });

    it('does not show summarizer badge on non-summarizer models', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4', 'claude-3-opus']}
          summarizerModelId="claude-3-opus"
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      // Should have badge on summarizer model
      const claudeCard = container.querySelector('[data-testid="model-card-claude-3-opus"]');
      expect(claudeCard).toHaveAttribute('data-summarizer', 'true');

      // Non-summarizer selected model should not have summarizer badge
      const gpt4Card = container.querySelector('[data-testid="model-card-gpt-4"]');
      expect(gpt4Card).toHaveAttribute('data-summarizer', 'false');
    });
  });

  describe('max selection limit', () => {
    it('disables unselected models when max selection reached', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4', 'claude-3-opus', 'gemini-pro']}
          maxSelection={3}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      // Check if there are disabled cards
      const disabledCards = container.querySelectorAll('[data-disabled="true"]');
      expect(disabledCards.length).toBeGreaterThan(0);
    });

    it('does not disable already selected models when max reached', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4', 'claude-3-opus', 'gemini-pro']}
          maxSelection={3}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      // Selected models should not be disabled
      const selectedCards = container.querySelectorAll('[data-selected="true"]');
      selectedCards.forEach((card) => {
        expect(card).not.toHaveAttribute('data-disabled', 'true');
      });
    });

    it('allows selection when below max limit', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4']}
          maxSelection={3}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      // Most cards should be enabled
      const enabledCards = container.querySelectorAll(
        '[data-testid^="model-card"]:not([data-disabled="true"])'
      );
      expect(enabledCards.length).toBeGreaterThan(0);
    });

    it('allows unlimited selection when maxSelection not provided', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4', 'claude-3-opus', 'gemini-pro', 'grok-1']}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      // No cards should be disabled due to max limit
      const disabledDueToMax = container.querySelectorAll(
        '[data-testid^="model-card"][data-disabled="true"]:not([data-selected="true"])'
      );
      // When no max is set, disabled cards should be minimal or none
      expect(disabledDueToMax.length).toBe(0);
    });
  });

  describe('provider api key requirement', () => {
    it('disables models for providers requiring API keys when not mock mode', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          providerStatus={{ openai: 'API key required' }}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const disabledCards = container.querySelectorAll('[data-provider="openai"][data-disabled="true"]');
      expect(disabledCards.length).toBeGreaterThan(0);
    });

    it('keeps already selected models enabled even if provider requires API key', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4']}
          providerStatus={{ openai: 'API key required' }}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const selectedCard = container.querySelector('[data-testid="model-card-gpt-4"]');
      expect(selectedCard).toHaveAttribute('data-disabled', 'false');
    });

    it('does not call toggle handler when provider requires API key', async () => {
      const user = userEvent.setup();
      const onModelToggle = vi.fn();

      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          providerStatus={{ openai: 'API key required' }}
          onModelToggle={onModelToggle}
          onSummarizerChange={vi.fn()}
        />
      );

      await user.click(screen.getByText('GPT-4'));
      expect(onModelToggle).not.toHaveBeenCalled();
    });

    it('still blocks selection when in mock mode without API keys', async () => {
      const user = userEvent.setup();
      const onModelToggle = vi.fn();

      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          providerStatus={{ openai: 'API key required' }}
          isMockMode
          onModelToggle={onModelToggle}
          onSummarizerChange={vi.fn()}
        />
      );

      await user.click(screen.getByText('GPT-4'));
      expect(onModelToggle).not.toHaveBeenCalled();
    });
  });

  describe('provider grouping', () => {
    it('displays OpenAI models in OpenAI section', () => {
      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const openaiSection = screen.getByText('OpenAI').closest('[data-testid="provider-section"]');
      expect(openaiSection).toBeInTheDocument();
    });

    it('displays Anthropic models in Anthropic section', () => {
      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const anthropicSection = screen
        .getByText('Anthropic')
        .closest('[data-testid="provider-section"]');
      expect(anthropicSection).toBeInTheDocument();
    });

    it('displays Google models in Google section', () => {
      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const googleSection = screen.getByText('Google').closest('[data-testid="provider-section"]');
      expect(googleSection).toBeInTheDocument();
    });

    it('displays XAI models in XAI section', () => {
      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const xaiSection = screen.getByText('XAI').closest('[data-testid="provider-section"]');
      expect(xaiSection).toBeInTheDocument();
    });

    it('does not render provider section when no models for that provider', () => {
      const openaiOnly = mockModels.filter((m) => m.provider === 'openai');

      render(
        <ModelSelectionList
          models={openaiOnly}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.queryByText('Anthropic')).not.toBeInTheDocument();
      expect(screen.queryByText('Google')).not.toBeInTheDocument();
      expect(screen.queryByText('XAI')).not.toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('uses grid layout for model cards', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });

    it('has proper spacing between provider sections', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const sections = container.querySelectorAll('[data-testid="provider-section"]');
      sections.forEach((section) => {
        expect(section).toHaveClass('mb-8');
      });
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA labels for model cards', () => {
      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4']}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const cards = screen.getAllByRole('button');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('indicates selection state via ARIA', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4']}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const selectedCard = container.querySelector('[data-selected="true"]');
      expect(selectedCard).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('composition', () => {
    it('composes ModelCard molecules', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const modelCards = container.querySelectorAll('[data-testid^="model-card"]');
      expect(modelCards.length).toBe(mockModels.length);
    });

    it('passes correct props to ModelCard components', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={['gpt-4']}
          summarizerModelId="gpt-4"
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      const gpt4Card = container.querySelector('[data-provider="openai"]');
      expect(gpt4Card).toHaveAttribute('data-selected', 'true');
      expect(gpt4Card).toHaveAttribute('data-summarizer', 'true');
    });
  });

  describe('provider status', () => {
    it('displays provider status indicators', () => {
      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          providerStatus={{
            openai: 'API key required',
            anthropic: 'Ready',
            google: 'Configuring',
          }}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      expect(screen.getByText('API key required')).toBeInTheDocument();
      expect(screen.getByText('✓ Ready')).toBeInTheDocument();
      expect(screen.getByText('Configuring')).toBeInTheDocument();
    });

    it('disables models when API key is required', () => {
      const { container } = render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          providerStatus={{
            openai: 'API key required',
            anthropic: 'Ready',
          }}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />
      );

      // OpenAI models should be disabled
      const openaiCards = container.querySelectorAll('[data-provider="openai"]');
      openaiCards.forEach((card) => {
        expect(card).toHaveAttribute('data-disabled', 'true');
      });

      // Anthropic models should not be disabled
      const anthropicCards = container.querySelectorAll('[data-provider="anthropic"]');
      anthropicCards.forEach((card) => {
        expect(card).toHaveAttribute('data-disabled', 'false');
      });
    });

    it('prevents selection when API key is required', async () => {
      const onModelToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <ModelSelectionList
          models={mockModels}
          selectedModelIds={[]}
          providerStatus={{
            openai: 'API key required',
          }}
          onModelToggle={onModelToggle}
          onSummarizerChange={vi.fn()}
        />
      );

      const gpt4Card = screen.getByText('GPT-4').closest('div[data-provider]');
      await user.click(gpt4Card!);

      // Should not call onModelToggle for disabled models
      expect(onModelToggle).not.toHaveBeenCalled();
    });
  });

  describe('internationalization', () => {
    it('renders English empty state message', () => {
      renderWithI18n(
        <ModelSelectionList
          models={[]}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />,
        { language: 'en' }
      );
      expect(screen.getByText('No models available')).toBeInTheDocument();
    });

    it('renders French empty state message', () => {
      renderWithI18n(
        <ModelSelectionList
          models={[]}
          selectedModelIds={[]}
          onModelToggle={vi.fn()}
          onSummarizerChange={vi.fn()}
        />,
        { language: 'fr' }
      );
      expect(screen.getByText('Aucun modèle disponible')).toBeInTheDocument();
    });
  });
});
