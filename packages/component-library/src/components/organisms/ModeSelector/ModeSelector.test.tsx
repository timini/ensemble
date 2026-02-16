import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSelector } from './ModeSelector';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ModeSelector', () => {
  describe('rendering', () => {
    it('renders the heading', () => {
      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      expect(screen.getByText('Select Your Mode')).toBeInTheDocument();
    });

    it('renders Free Mode card', () => {
      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      expect(screen.getByText('Free Mode')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Bring your own API keys. Completely secure, your keys are encrypted and never leave your browser./
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Start in Free Mode')).toBeInTheDocument();
    });

    it('renders Pro Mode card', () => {
      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      expect(screen.getByText('Pro Mode')).toBeInTheDocument();
      expect(
        screen.getByText(/Buy credits to get access to the latest models across all providers./)
      ).toBeInTheDocument();
      expect(screen.getByText('Go Pro')).toBeInTheDocument();
    });

    it('renders both mode cards in a grid', () => {
      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const grid = screen.getByTestId('mode-selector-grid');
      expect(grid).toBeInTheDocument();
    });

    it('renders icons for both modes', () => {
      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const icons = screen.getAllByText(/🔧|⭐/);
      expect(icons).toHaveLength(2);
    });

    it('has data-mode attributes for both cards', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      expect(container.querySelector('[data-mode="free"]')).toBeInTheDocument();
      expect(container.querySelector('[data-mode="pro"]')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onSelectFreeMode when Free Mode button is clicked', async () => {
      const onSelectFreeMode = vi.fn();
      const user = userEvent.setup();

      render(
        <ModeSelector onSelectFreeMode={onSelectFreeMode} onSelectProMode={vi.fn()} />
      );

      const button = screen.getByText('Start in Free Mode');
      await user.click(button);

      expect(onSelectFreeMode).toHaveBeenCalledTimes(1);
    });

    it('calls onSelectProMode when Pro Mode button is clicked', async () => {
      const onSelectProMode = vi.fn();
      const user = userEvent.setup();

      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={onSelectProMode} />
      );

      const button = screen.getByText('Go Pro');
      await user.click(button);

      expect(onSelectProMode).toHaveBeenCalledTimes(1);
    });

    it('does not call callbacks when disabled', async () => {
      const onSelectFreeMode = vi.fn();
      const onSelectProMode = vi.fn();
      const user = userEvent.setup();

      render(
        <ModeSelector
          onSelectFreeMode={onSelectFreeMode}
          onSelectProMode={onSelectProMode}
          disabled
        />
      );

      const freeButton = screen.getByText('Start in Free Mode');
      const proButton = screen.getByText('Go Pro');

      await user.click(freeButton);
      await user.click(proButton);

      expect(onSelectFreeMode).not.toHaveBeenCalled();
      expect(onSelectProMode).not.toHaveBeenCalled();
    });

    it('disables Free Mode when freeModeDisabled is true', async () => {
      const onSelectFreeMode = vi.fn();
      const user = userEvent.setup();

      render(
        <ModeSelector
          onSelectFreeMode={onSelectFreeMode}
          onSelectProMode={vi.fn()}
          freeModeDisabled
        />
      );

      const freeButton = screen.getByText('Start in Free Mode');
      expect(freeButton).toBeDisabled();

      await user.click(freeButton);
      expect(onSelectFreeMode).not.toHaveBeenCalled();
    });
  });

  describe('selected state', () => {
    it('highlights Free Mode card when selected', () => {
      const { container } = render(
        <ModeSelector
          selectedMode="free"
          onSelectFreeMode={vi.fn()}
          onSelectProMode={vi.fn()}
        />
      );

      const freeCard = container.querySelector('[data-mode="free"]');
      expect(freeCard).toHaveClass('border-primary');
      expect(freeCard).toHaveClass('bg-primary/10');
    });

    it('highlights Pro Mode card when selected', () => {
      const { container } = render(
        <ModeSelector
          selectedMode="pro"
          onSelectFreeMode={vi.fn()}
          onSelectProMode={vi.fn()}
        />
      );

      const proCard = container.querySelector('[data-mode="pro"]');
      expect(proCard).toHaveClass('border-primary');
      expect(proCard).toHaveClass('bg-primary/10');
    });

    it('does not highlight any card when no mode is selected', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const freeCard = container.querySelector('[data-mode="free"]');
      const proCard = container.querySelector('[data-mode="pro"]');

      expect(freeCard).not.toHaveClass('border-primary');
      expect(proCard).not.toHaveClass('border-primary');
    });
  });

  describe('styling', () => {
    it('applies hover styles to cards', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const cards = container.querySelectorAll('[data-testid^="mode-card-"]');
      cards.forEach(card => expect(card).toHaveClass('hover:border-primary/30'));
    });

    it('applies consistent spacing between cards', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const grid = container.querySelector('.gap-6');
      expect(grid).toBeInTheDocument();
    });

    it('applies icon circle styling', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const iconCircles = container.querySelectorAll('.rounded-full');
      expect(iconCircles).toHaveLength(2);
    });
  });

  describe('accessibility', () => {
    it('has semantic heading structure', () => {
      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('has clickable buttons', () => {
      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('disables buttons when disabled prop is true', () => {
      render(
        <ModeSelector
          onSelectFreeMode={vi.fn()}
          onSelectProMode={vi.fn()}
          disabled
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('layout', () => {
    it('uses responsive grid layout', () => {
      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const grid = screen.getByTestId('mode-selector-grid');
      expect(grid).toBeInTheDocument();
    });

    it('renders cards with consistent padding', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const cardContents = container.querySelectorAll('.p-6');
      expect(cardContents.length).toBeGreaterThanOrEqual(2);
    });

    it('renders full-width buttons', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const fullWidthButtons = container.querySelectorAll('.w-full');
      expect(fullWidthButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('handles rapid clicks on Free Mode button', async () => {
      const onSelectFreeMode = vi.fn();
      const user = userEvent.setup();

      render(
        <ModeSelector onSelectFreeMode={onSelectFreeMode} onSelectProMode={vi.fn()} />
      );

      const button = screen.getByText('Start in Free Mode');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(onSelectFreeMode).toHaveBeenCalledTimes(3);
    });

    it('handles rapid clicks on Pro Mode button', async () => {
      const onSelectProMode = vi.fn();
      const user = userEvent.setup();

      render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={onSelectProMode} />
      );

      const button = screen.getByText('Go Pro');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(onSelectProMode).toHaveBeenCalledTimes(3);
    });

    it('can switch between modes', async () => {
      const onSelectFreeMode = vi.fn();
      const onSelectProMode = vi.fn();
      const user = userEvent.setup();

      const { rerender, container } = render(
        <ModeSelector
          selectedMode="free"
          onSelectFreeMode={onSelectFreeMode}
          onSelectProMode={onSelectProMode}
        />
      );

      // Initially Free Mode is selected
      expect(container.querySelector('[data-mode="free"]')).toHaveClass('border-primary');

      // Switch to Pro Mode
      const proButton = screen.getByText('Go Pro');
      await user.click(proButton);
      expect(onSelectProMode).toHaveBeenCalledTimes(1);

      // Rerender with Pro Mode selected
      rerender(
        <ModeSelector
          selectedMode="pro"
          onSelectFreeMode={onSelectFreeMode}
          onSelectProMode={onSelectProMode}
        />
      );

      expect(container.querySelector('[data-mode="pro"]')).toHaveClass('border-primary');
    });
  });

  describe('internationalization', () => {
    it('renders English heading text', () => {
      renderWithI18n(<ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />, {
        language: 'en',
      });
      expect(screen.getByText('Select Your Mode')).toBeInTheDocument();
    });

    it('renders French heading text', () => {
      renderWithI18n(<ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />, {
        language: 'fr',
      });
      expect(screen.getByText('Sélectionnez Votre Mode')).toBeInTheDocument();
    });
  });
});
