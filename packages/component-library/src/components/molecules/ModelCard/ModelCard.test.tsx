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

    it('renders model logo', () => {
      render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      expect(screen.getByTestId('model-logo-openai')).toBeInTheDocument();
    });

    it('renders card content', () => {
      render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      expect(screen.getByTestId('model-card')).toBeInTheDocument();
    });

    it('renders modality badges when provided', () => {
      render(
        <ModelCard
          provider="openai"
          modelName="GPT-4o"
          selected={false}
          isSummarizer={false}
          modelId="gpt-4o"
          modalities={['text', 'image']}
        />
      );

      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Image')).toBeInTheDocument();
      expect(screen.getByTestId('model-modality-gpt-4o-text')).toBeInTheDocument();
      expect(screen.getByTestId('model-modality-gpt-4o-image')).toBeInTheDocument();
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

    it('applies selected data attribute', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('data-selected', 'true');
    });

    it('applies unselected data attribute', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('data-selected', 'false');
    });

    it('applies summarizer data attribute when selected and summarizer', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={true} />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('data-summarizer', 'true');
      expect(card).toHaveAttribute('data-selected', 'true');
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
    it('renders OpenAI model logo correctly', () => {
      render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      expect(screen.getByTestId('model-logo-openai')).toHaveAttribute('data-logo-key', 'openai');
    });

    it('renders Claude model logo for Anthropic models', () => {
      render(<ModelCard provider="anthropic" modelName="Claude 3.5 Sonnet" selected={false} isSummarizer={false} />);
      expect(screen.getByTestId('model-logo-anthropic')).toHaveAttribute('data-logo-key', 'claude');
    });

    it('renders Gemini model logo for Google models', () => {
      render(<ModelCard provider="google" modelName="Gemini Pro" selected={false} isSummarizer={false} />);
      expect(screen.getByTestId('model-logo-google')).toHaveAttribute('data-logo-key', 'gemini');
    });

    it('renders Grok model logo for xAI models', () => {
      render(<ModelCard provider="xai" modelName="Grok" selected={false} isSummarizer={false} />);
      expect(screen.getByTestId('model-logo-xai')).toHaveAttribute('data-logo-key', 'grok');
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
    it('applies disabled data attribute', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} disabled />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('data-disabled', 'true');
    });

    it('has aria-disabled when disabled', () => {
      const { container } = render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} disabled />);
      const card = container.querySelector('[data-testid="model-card"]');
      expect(card).toHaveAttribute('aria-disabled', 'true');
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
      render(<ModelCard provider="openai" modelName="GPT-4" selected={true} isSummarizer={true} />);
      expect(screen.getByText('Summarizer')).toBeInTheDocument();
    });

    it('does not render badge when not summarizer', () => {
      render(<ModelCard provider="openai" modelName="GPT-4" selected={false} isSummarizer={false} />);
      expect(screen.queryByText('Summarizer')).not.toBeInTheDocument();
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

    it('renders modality badges in French', () => {
      renderWithI18n(
        <ModelCard
          provider="google"
          modelName="Gemini"
          selected={false}
          isSummarizer={false}
          modalities={['text', 'image']}
        />,
        { language: 'fr' }
      );

      expect(screen.getByText('Texte')).toBeInTheDocument();
      expect(screen.getByText('Image')).toBeInTheDocument();
    });
  });

  describe('regression - data attributes for states', () => {
    it('applies correct data attributes when selected', () => {
      const { container } = render(
        <ModelCard
          provider="openai"
          modelName="GPT-4"
          selected={true}
          isSummarizer={false}
        />
      );
      const card = container.querySelector('[data-testid="model-card"]');

      expect(card).toHaveAttribute('data-selected', 'true');
      expect(card).toHaveAttribute('data-summarizer', 'false');
      expect(card).toHaveAttribute('data-provider', 'openai');
    });

    it('applies correct data attributes when summarizer', () => {
      const { container } = render(
        <ModelCard
          provider="anthropic"
          modelName="Claude 3"
          selected={true}
          isSummarizer={true}
        />
      );
      const card = container.querySelector('[data-testid="model-card"]');

      expect(card).toHaveAttribute('data-selected', 'true');
      expect(card).toHaveAttribute('data-summarizer', 'true');
      expect(card).toHaveAttribute('data-provider', 'anthropic');
    });
  });
});
