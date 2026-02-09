import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelCard } from './ModelCard';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ModelCard', () => {
  describe('rendering', () => {
    it('renders model name', () => {
      render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
    });

    it('renders as a Card component', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toBeInTheDocument();
    });

    it('renders provider icon emoji', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const icon = container.querySelector('.text-2xl');
      expect(icon).toHaveTextContent('🤖');
    });

    it('renders centered layout', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const content = container.querySelector('.text-center');
      expect(content).toBeInTheDocument();
    });
  });

  describe('selection states', () => {
    it('shows unselected state by default', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).not.toHaveAttribute('data-selected', 'true');
    });

    it('shows selected state when selected prop is true', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('data-selected', 'true');
    });

    it('applies selected styling', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveClass('border-blue-500');
      expect(card).toHaveClass('bg-blue-50');
    });

    it('applies unselected styling', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveClass('border-gray-200');
    });

    it('applies summarizer styling when selected and summarizer', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={true} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveClass('border-orange-500');
      expect(card).toHaveClass('bg-orange-50');
    });
  });

  describe('summarizer indicator', () => {
    it('shows summarizer badge when isSummarizer is true', () => {
      render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={true} />);
      expect(screen.getByText('Summarizer')).toBeInTheDocument();
    });

    it('does not show summarizer badge when isSummarizer is false', () => {
      render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={false} />);
      expect(screen.queryByText('Summarizer')).not.toBeInTheDocument();
    });

    it('applies summarizer data attribute', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={true} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('data-summarizer', 'true');
    });
  });

  describe('provider-specific behavior', () => {
    it('renders OpenAI provider icon correctly', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const icon = container.querySelector('.text-2xl');
      expect(icon).toHaveTextContent('🤖');
    });

    it('renders Anthropic provider icon correctly', () => {
      const { container } = render(<ModelCard provider="anthropic" modelName="Claude 3.5 Sonnet" selected={false} isSummarizer={false} />);
      const icon = container.querySelector('.text-2xl');
      expect(icon).toHaveTextContent('🧠');
    });

    it('renders Google provider icon correctly', () => {
      const { container } = render(<ModelCard provider="google" modelName="Gemini Pro" selected={false} isSummarizer={false} />);
      const icon = container.querySelector('.text-2xl');
      expect(icon).toHaveTextContent('🔍');
    });

    it('renders XAI provider icon correctly', () => {
      const { container } = render(<ModelCard provider="xai" modelName="Grok" selected={false} isSummarizer={false} />);
      const icon = container.querySelector('.text-2xl');
      expect(icon).toHaveTextContent('🚀');
    });

    it('applies correct provider data attribute', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('data-provider', 'openai');
    });
  });

  describe('user interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const onClick = vi.fn();
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} onClick={onClick} />);

      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toBeInTheDocument();

      await userEvent.click(card!);
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('does not call onClick when disabled', async () => {
      const onClick = vi.fn();
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} disabled onClick={onClick} />);

      const card = container.querySelector('[data-testid="model-card"]');
      await userEvent.click(card!);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('toggles selection on click', async () => {
      const onClick = vi.fn();
      const { container, rerender } = render(
        <ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} onClick={onClick} />
      );

      const card = container.querySelector('[data-testid="model-card"]');
      await userEvent.click(card!);

      // Simulate parent component updating the selected state
      rerender(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={false} onClick={onClick} />);

      expect(card).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('disabled state', () => {
    it('applies disabled styling', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} disabled />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveClass('opacity-50');
    });

    it('applies disabled cursor style', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} disabled />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveClass('cursor-not-allowed');
    });

    it('applies disabled data attribute', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} disabled />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('data-disabled', 'true');
    });
  });

  describe('accessibility', () => {
    it('has appropriate role', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('role', 'button');
    });

    it('has appropriate aria-pressed attribute when selected', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('aria-pressed', 'true');
    });

    it('has appropriate aria-pressed attribute when unselected', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('aria-pressed', 'false');
    });

    it('has appropriate aria-disabled attribute when disabled', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} disabled />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('aria-disabled', 'true');
    });

    it('supports keyboard navigation', async () => {
      const onClick = vi.fn();
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} onClick={onClick} />);

      const card = container.querySelector('[data-testid="model-card"]') as HTMLElement;
      card?.focus();

      await userEvent.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalled();
    });

    it('supports space key activation', async () => {
      const onClick = vi.fn();
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} onClick={onClick} />);

      const card = container.querySelector('[data-testid="model-card"]') as HTMLElement;
      card?.focus();

      await userEvent.keyboard(' ');
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('composition', () => {
    it('uses Card atom for structure', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card?.tagName.toLowerCase()).toBe('div');
    });

    it('uses Badge atom for summarizer indicator', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={true} />);
      const badge = container.querySelector('.inline-flex.items-center.rounded-full');
      expect(badge).toBeInTheDocument();
    });

    it('does not render badge when not summarizer', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const badge = container.querySelector('.inline-flex.items-center.rounded-full');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders summarizer badge in English', () => {
      renderWithI18n(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={true} />, { language: 'en' });
      expect(screen.getByText('Summarizer')).toBeInTheDocument();
    });

    it('renders summarizer badge in French', () => {
      renderWithI18n(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={true} />, { language: 'fr' });
      expect(screen.getByText('Synthétiseur')).toBeInTheDocument();
    });

    it('does not render summarizer badge when isSummarizer is false in English', () => {
      renderWithI18n(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={false} />, { language: 'en' });
      expect(screen.queryByText('Summarizer')).not.toBeInTheDocument();
    });

    it('does not render summarizer badge when isSummarizer is false in French', () => {
      renderWithI18n(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={false} />, { language: 'fr' });
      expect(screen.queryByText('Synthétiseur')).not.toBeInTheDocument();
    });
  });

  describe('regression - styling and dark mode', () => {
    it('applies explicit selection highlighting classes including dark mode', () => {
      const { container } = render(
        <ModelCard
          provider="openai"
          modelName="GPT-4"
          selected={true}
          isSummarizer={false}
        />
      );
      const card = container.querySelector('[data-testid="model-card"]');

      // Explicitly check for the highlighting classes
      expect(card).toHaveClass('border-blue-500');
      expect(card).toHaveClass('bg-blue-50');
      expect(card).toHaveClass('dark:bg-blue-950/30');

      // Ensure defaults are overridden
      expect(card).not.toHaveClass('border-gray-200');
      // Ensure bg-card is removed by merge to prevent conflicts
      expect(card).not.toHaveClass('bg-card');
    });

    it('applies explicit summarizer highlighting classes including dark mode', () => {
      const { container } = render(
        <ModelCard
          provider="anthropic"
          modelName="Claude 3"
          selected={true}
          isSummarizer={true}
        />
      );
      const card = container.querySelector('[data-testid="model-card"]');

      expect(card).toHaveClass('border-orange-500');
      expect(card).toHaveClass('bg-orange-50');
      expect(card).toHaveClass('dark:bg-orange-950/30');

      expect(card).not.toHaveClass('border-gray-200');
      expect(card).not.toHaveClass('border-blue-500');
      expect(card).not.toHaveClass('bg-card');
    });
  });
});
