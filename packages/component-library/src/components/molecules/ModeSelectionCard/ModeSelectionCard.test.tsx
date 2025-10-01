import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeSelectionCard } from './ModeSelectionCard';

describe('ModeSelectionCard', () => {
  describe('rendering', () => {
    it('renders free mode with correct title', () => {
      render(<ModeSelectionCard mode="free" selected={false} />);
      expect(screen.getByText('Free Mode')).toBeInTheDocument();
    });

    it('renders pro mode with correct title', () => {
      render(<ModeSelectionCard mode="pro" selected={false} />);
      expect(screen.getByText('Pro Mode')).toBeInTheDocument();
    });

    it('renders free mode description', () => {
      render(<ModeSelectionCard mode="free" selected={false} />);
      expect(screen.getByText(/single AI provider/i)).toBeInTheDocument();
    });

    it('renders pro mode description', () => {
      render(<ModeSelectionCard mode="pro" selected={false} />);
      expect(screen.getByText(/multiple AI providers/i)).toBeInTheDocument();
    });
  });

  describe('selected state', () => {
    it('shows selected badge when selected', () => {
      render(<ModeSelectionCard mode="free" selected={true} />);
      expect(screen.getByText('Selected')).toBeInTheDocument();
    });

    it('does not show selected badge when unselected', () => {
      render(<ModeSelectionCard mode="free" selected={false} />);
      expect(screen.queryByText('Selected')).not.toBeInTheDocument();
    });

    it('applies selected visual style', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={true} />);
      const card = container.querySelector('[data-selected="true"]');
      expect(card).toBeInTheDocument();
    });

    it('applies unselected visual style', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      const card = container.querySelector('[data-selected="false"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('applies disabled visual style', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} disabled={true} />);
      const card = container.querySelector('[data-disabled="true"]');
      expect(card).toBeInTheDocument();
    });

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ModeSelectionCard mode="free" selected={false} disabled={true} onClick={onClick} />);

      const card = screen.getByText('Free Mode').closest('[role="button"]');
      if (card) await user.click(card);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('is not keyboard accessible when disabled', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} disabled={true} />);
      const card = container.querySelector('[tabindex="-1"]');
      expect(card).toBeInTheDocument();
    });

    it('does not have disabled attribute when enabled', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} disabled={false} />);
      const card = container.querySelector('[data-disabled="false"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ModeSelectionCard mode="free" selected={false} onClick={onClick} />);

      const card = screen.getByText('Free Mode').closest('[role="button"]');
      if (card) await user.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ModeSelectionCard mode="free" selected={false} onClick={onClick} />);

      const card = screen.getByText('Free Mode').closest('[role="button"]') as HTMLElement;
      if (card) {
        card.focus();
        await user.keyboard('{Enter}');
      }

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Space key is pressed', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ModeSelectionCard mode="free" selected={false} onClick={onClick} />);

      const card = screen.getByText('Free Mode').closest('[role="button"]') as HTMLElement;
      if (card) {
        card.focus();
        await user.keyboard(' ');
      }

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when other keys are pressed', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<ModeSelectionCard mode="free" selected={false} onClick={onClick} />);

      const card = screen.getByText('Free Mode').closest('[role="button"]') as HTMLElement;
      if (card) {
        card.focus();
        await user.keyboard('{Escape}');
        await user.keyboard('a');
      }

      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when not provided', async () => {
      const user = userEvent.setup();

      render(<ModeSelectionCard mode="free" selected={false} />);

      const card = screen.getByText('Free Mode').closest('[role="button"]');
      // Should not throw error
      if (card) await user.click(card);

      expect(true).toBe(true); // No error thrown
    });
  });

  describe('mode-specific icons', () => {
    it('renders icon for free mode', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders icon for pro mode', () => {
      const { container } = render(<ModeSelectionCard mode="pro" selected={false} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has button role', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      const card = container.querySelector('[role="button"]');
      expect(card).toBeInTheDocument();
    });

    it('is keyboard accessible when enabled', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      const card = container.querySelector('[tabindex="0"]');
      expect(card).toBeInTheDocument();
    });

    it('has aria-pressed attribute when selected', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={true} />);
      const card = container.querySelector('[aria-pressed="true"]');
      expect(card).toBeInTheDocument();
    });

    it('has aria-pressed false when unselected', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      const card = container.querySelector('[aria-pressed="false"]');
      expect(card).toBeInTheDocument();
    });

    it('has aria-disabled when disabled', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} disabled={true} />);
      const card = container.querySelector('[aria-disabled="true"]');
      expect(card).toBeInTheDocument();
    });

    it('does not have aria-disabled when enabled', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} disabled={false} />);
      const card = container.querySelector('[aria-disabled="false"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('composition', () => {
    it('uses Card atom for structure', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      // Card will have rounded corners
      const card = container.querySelector('.rounded-xl');
      expect(card).toBeInTheDocument();
    });

    it('uses Badge atom for selected indicator', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={true} />);
      const badge = container.querySelector('.inline-flex.items-center.rounded-full');
      expect(badge).toBeInTheDocument();
    });

    it('uses Icon atom for mode icon', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('mode data attributes', () => {
    it('sets data-mode attribute for free', () => {
      const { container } = render(<ModeSelectionCard mode="free" selected={false} />);
      const card = container.querySelector('[data-mode="free"]');
      expect(card).toBeInTheDocument();
    });

    it('sets data-mode attribute for pro', () => {
      const { container } = render(<ModeSelectionCard mode="pro" selected={false} />);
      const card = container.querySelector('[data-mode="pro"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('forwarding ref', () => {
    it('forwards ref to card element', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<ModeSelectionCard mode="free" selected={false} ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});

// Add React import for ref test
import * as React from 'react';
