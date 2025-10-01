import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSelector } from './ModeSelector';

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
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const grid = container.querySelector('.grid.grid-cols-2');
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
      expect(freeCard).toHaveClass('border-blue-500');
      expect(freeCard).toHaveClass('bg-blue-50');
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
      expect(proCard).toHaveClass('border-blue-500');
      expect(proCard).toHaveClass('bg-blue-50');
    });

    it('does not highlight any card when no mode is selected', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const freeCard = container.querySelector('[data-mode="free"]');
      const proCard = container.querySelector('[data-mode="pro"]');

      expect(freeCard).not.toHaveClass('border-blue-500');
      expect(proCard).not.toHaveClass('border-blue-500');
    });
  });

  describe('styling', () => {
    it('applies hover styles to cards', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const cards = container.querySelectorAll('.hover\\:border-blue-200');
      expect(cards).toHaveLength(2);
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

      const iconCircles = container.querySelectorAll('.bg-blue-100.rounded-full');
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
    it('uses 2-column grid layout', () => {
      const { container } = render(
        <ModeSelector onSelectFreeMode={vi.fn()} onSelectProMode={vi.fn()} />
      );

      const grid = container.querySelector('.grid-cols-2');
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
      expect(container.querySelector('[data-mode="free"]')).toHaveClass('border-blue-500');

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

      expect(container.querySelector('[data-mode="pro"]')).toHaveClass('border-blue-500');
    });
  });
});
