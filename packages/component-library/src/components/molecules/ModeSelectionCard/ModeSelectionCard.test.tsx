import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSelectionCard } from './ModeSelectionCard';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ModeSelectionCard', () => {
  describe('rendering', () => {
    it('renders free mode with correct title', () => {
      render(<ModeSelectionCard mode="free" />);
      expect(screen.getByText('Free Mode')).toBeInTheDocument();
    });

    it('renders pro mode with correct title', () => {
      render(<ModeSelectionCard mode="pro" />);
      expect(screen.getByText('Pro Mode')).toBeInTheDocument();
    });

    it('renders free mode description', () => {
      render(<ModeSelectionCard mode="free" />);
      expect(
        screen.getByText(/Bring your own API keys. Completely secure/)
      ).toBeInTheDocument();
    });

    it('renders pro mode description', () => {
      render(<ModeSelectionCard mode="pro" />);
      expect(
        screen.getByText(/Buy credits to get access to the latest models/)
      ).toBeInTheDocument();
    });

    it('renders free mode icon', () => {
      render(<ModeSelectionCard mode="free" />);
      expect(screen.getByText('🔧')).toBeInTheDocument();
    });

    it('renders pro mode icon', () => {
      render(<ModeSelectionCard mode="pro" />);
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('renders free mode button', () => {
      render(<ModeSelectionCard mode="free" />);
      expect(screen.getByText('Start in Free Mode')).toBeInTheDocument();
    });

    it('renders pro mode button', () => {
      render(<ModeSelectionCard mode="pro" />);
      expect(screen.getByText('Go Pro')).toBeInTheDocument();
    });
  });

  describe('selected state', () => {
    it('applies selected styling when selected', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={true} />);
      const card = container.querySelector('[data-selected="true"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('border-blue-500');
      expect(card).toHaveClass('bg-blue-50');
    });

    it('does not apply selected styling when unselected', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      const card = container.querySelector('[data-selected="false"]');
      expect(card).toBeInTheDocument();
      expect(card).not.toHaveClass('border-blue-500');
      expect(card).not.toHaveClass('bg-blue-50');
    });

    it('has correct data attribute for selected state', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={true} />);
      const card = container.querySelector('[data-selected="true"]');
      expect(card).toBeInTheDocument();
    });

    it('has correct data attribute for unselected state', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      const card = container.querySelector('[data-selected="false"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('applies disabled data attribute', () => {
      const { container } = render(<ModeSelectionCard mode="free" disabled={true} />);
      const card = container.querySelector('[data-disabled="true"]');
      expect(card).toBeInTheDocument();
    });

    it('disables the button when disabled', () => {
      render(<ModeSelectionCard mode="free" disabled={true} />);
      const button = screen.getByText('Start in Free Mode');
      expect(button).toBeDisabled();
    });

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ModeSelectionCard mode="free" disabled={true} onClick={onClick} />);

      const button = screen.getByText('Start in Free Mode');
      await user.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not have disabled attribute when enabled', () => {
      const { container } = render(<ModeSelectionCard mode="free" disabled={false} />);
      const card = container.querySelector('[data-disabled="false"]');
      expect(card).toBeInTheDocument();
    });

    it('enables the button when not disabled', () => {
      render(<ModeSelectionCard mode="free" disabled={false} />);
      const button = screen.getByText('Start in Free Mode');
      expect(button).not.toBeDisabled();
    });
  });

  describe('user interactions', () => {
    it('calls onClick when button is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ModeSelectionCard mode="free" onClick={onClick} />);

      const button = screen.getByText('Start in Free Mode');
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick for pro mode button', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ModeSelectionCard mode="pro" onClick={onClick} />);

      const button = screen.getByText('Go Pro');
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('handles multiple clicks', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ModeSelectionCard mode="free" onClick={onClick} />);

      const button = screen.getByText('Start in Free Mode');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it('does not call onClick when no handler is provided', async () => {
      const user = userEvent.setup();

      render(<ModeSelectionCard mode="free" />);

      const button = screen.getByText('Start in Free Mode');
      await user.click(button);

      // Should not throw
      expect(button).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies hover border style', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const card = container.querySelector('.hover\\:border-blue-200');
      expect(card).toBeInTheDocument();
    });

    it('applies transition classes', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const card = container.querySelector('.transition-colors');
      expect(card).toBeInTheDocument();
    });

    it('applies correct icon circle styling', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const iconCircle = container.querySelector('.bg-blue-100.rounded-full');
      expect(iconCircle).toBeInTheDocument();
    });

    it('applies full-width button styling', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const button = container.querySelector('.w-full');
      expect(button).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has a heading for the mode title', () => {
      render(<ModeSelectionCard mode="free" />);
      const heading = screen.getByRole('heading', { name: /Free Mode/i });
      expect(heading).toBeInTheDocument();
    });

    it('has a clickable button', () => {
      render(<ModeSelectionCard mode="free" />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('button has accessible text', () => {
      render(<ModeSelectionCard mode="free" />);
      const button = screen.getByRole('button', { name: /Start in Free Mode/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('dark mode', () => {
    it('applies dark mode selected background class', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={true} />);
      const card = container.querySelector('[data-selected="true"]');
      expect(card).toHaveClass('dark:bg-blue-950');
    });

    it('applies dark mode hover border class', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const card = container.querySelector('[data-testid="mode-card-free"]');
      expect(card).toHaveClass('dark:hover:border-blue-800');
    });

    it('applies dark mode icon background class', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const iconCircle = container.querySelector('.bg-blue-100');
      expect(iconCircle).toHaveClass('dark:bg-blue-900');
    });

    it('applies dark mode icon text color class', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const icon = container.querySelector('.text-blue-600');
      expect(icon).toHaveClass('dark:text-blue-400');
    });

    it('applies dark mode description text class', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const description = container.querySelector('.text-gray-600');
      expect(description).toHaveClass('dark:text-gray-400');
    });

    it('applies dark mode title text class', () => {
      render(<ModeSelectionCard mode="free" />);
      const title = screen.getByRole('heading', { name: /Free Mode/i });
      expect(title).toHaveClass('dark:text-gray-100');
    });

    it('applies dark mode default border class', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const card = container.querySelector('[data-testid="mode-card-free"]');
      expect(card).toHaveClass('dark:border-gray-700');
    });
  });

  describe('data attributes', () => {
    it('sets data-mode attribute for free mode', () => {
      const { container } = render(<ModeSelectionCard mode="free" />);
      const card = container.querySelector('[data-mode="free"]');
      expect(card).toBeInTheDocument();
    });

    it('sets data-mode attribute for pro mode', () => {
      const { container } = render(<ModeSelectionCard mode="pro" />);
      const card = container.querySelector('[data-mode="pro"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders free mode title in English', () => {
      renderWithI18n(<ModeSelectionCard mode="free" />, { language: 'en' });
      expect(screen.getByText('Free Mode')).toBeInTheDocument();
    });

    it('renders free mode title in French', () => {
      renderWithI18n(<ModeSelectionCard mode="free" />, { language: 'fr' });
      expect(screen.getByText('Mode Gratuit')).toBeInTheDocument();
    });

    it('renders pro mode title in English', () => {
      renderWithI18n(<ModeSelectionCard mode="pro" />, { language: 'en' });
      expect(screen.getByText('Pro Mode')).toBeInTheDocument();
    });

    it('renders pro mode title in French', () => {
      renderWithI18n(<ModeSelectionCard mode="pro" />, { language: 'fr' });
      expect(screen.getByText('Mode Pro')).toBeInTheDocument();
    });

    it('renders free mode description in English', () => {
      renderWithI18n(<ModeSelectionCard mode="free" />, { language: 'en' });
      expect(screen.getByText(/Bring your own API keys/)).toBeInTheDocument();
    });

    it('renders free mode description in French', () => {
      renderWithI18n(<ModeSelectionCard mode="free" />, { language: 'fr' });
      expect(screen.getByText(/Utilisez vos propres clés API/)).toBeInTheDocument();
    });

    it('renders free mode button text in English', () => {
      renderWithI18n(<ModeSelectionCard mode="free" />, { language: 'en' });
      expect(screen.getByText('Start in Free Mode')).toBeInTheDocument();
    });

    it('renders free mode button text in French', () => {
      renderWithI18n(<ModeSelectionCard mode="free" />, { language: 'fr' });
      expect(screen.getByText('Démarrer en Mode Gratuit')).toBeInTheDocument();
    });

    it('renders pro mode button text in English', () => {
      renderWithI18n(<ModeSelectionCard mode="pro" />, { language: 'en' });
      expect(screen.getByText('Go Pro')).toBeInTheDocument();
    });

    it('renders pro mode button text in French', () => {
      renderWithI18n(<ModeSelectionCard mode="pro" />, { language: 'fr' });
      expect(screen.getByText('Passer au Pro')).toBeInTheDocument();
    });
  });
});
