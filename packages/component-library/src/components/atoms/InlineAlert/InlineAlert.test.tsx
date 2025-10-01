import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineAlert } from './InlineAlert';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('InlineAlert', () => {
  describe('rendering', () => {
    it('renders message correctly', () => {
      render(<InlineAlert>Test message</InlineAlert>);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('renders with info variant by default', () => {
      const { container } = render(<InlineAlert>Message</InlineAlert>);
      const alert = container.firstChild;
      expect(alert).toHaveClass('bg-blue-50');
    });

    it('renders with success variant', () => {
      const { container } = render(<InlineAlert variant="success">Message</InlineAlert>);
      const alert = container.firstChild;
      expect(alert).toHaveClass('bg-green-50');
    });

    it('renders with warning variant', () => {
      const { container } = render(<InlineAlert variant="warning">Message</InlineAlert>);
      const alert = container.firstChild;
      expect(alert).toHaveClass('bg-yellow-50');
    });

    it('renders with error variant', () => {
      const { container } = render(<InlineAlert variant="error">Message</InlineAlert>);
      const alert = container.firstChild;
      expect(alert).toHaveClass('bg-red-50');
    });

    it('renders info icon for info variant', () => {
      const { container } = render(<InlineAlert variant="info">Message</InlineAlert>);
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-blue-600');
    });

    it('renders check icon for success variant', () => {
      const { container} = render(<InlineAlert variant="success">Message</InlineAlert>);
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-green-600');
    });

    it('renders alert triangle for warning variant', () => {
      const { container } = render(<InlineAlert variant="warning">Message</InlineAlert>);
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-yellow-600');
    });

    it('renders alert circle for error variant', () => {
      const { container } = render(<InlineAlert variant="error">Message</InlineAlert>);
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-red-600');
    });

    it('does not show dismiss button by default', () => {
      render(<InlineAlert>Message</InlineAlert>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows dismiss button when dismissible', () => {
      render(<InlineAlert dismissible>Message</InlineAlert>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<InlineAlert className="custom-class">Message</InlineAlert>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('interactions', () => {
    it('calls onDismiss when dismiss button clicked', async () => {
      const handleDismiss = vi.fn();
      render(
        <InlineAlert dismissible onDismiss={handleDismiss}>
          Message
        </InlineAlert>
      );

      const dismissButton = screen.getByRole('button');
      await userEvent.click(dismissButton);
      expect(handleDismiss).toHaveBeenCalledOnce();
    });
  });

  describe('accessibility', () => {
    it('has role="alert" by default', () => {
      const { container } = render(<InlineAlert>Message</InlineAlert>);
      expect(container.firstChild).toHaveAttribute('role', 'alert');
    });

    it('can override role', () => {
      const { container } = render(<InlineAlert role="status">Message</InlineAlert>);
      expect(container.firstChild).toHaveAttribute('role', 'status');
    });

    it('dismiss button has aria-label', () => {
      render(<InlineAlert dismissible>Message</InlineAlert>);
      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss');
    });
  });

  describe('snapshots', () => {
    it('matches snapshot for info variant', () => {
      const { container } = render(<InlineAlert variant="info">Message</InlineAlert>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for success variant', () => {
      const { container } = render(<InlineAlert variant="success">Message</InlineAlert>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for dismissible alert', () => {
      const { container } = render(<InlineAlert dismissible>Message</InlineAlert>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('internationalization', () => {
    it('renders dismiss button with English label', () => {
      renderWithI18n(<InlineAlert dismissible>Message</InlineAlert>, { language: 'en' });
      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss');
    });

    it('renders dismiss button with French label', () => {
      renderWithI18n(<InlineAlert dismissible>Message</InlineAlert>, { language: 'fr' });
      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveAttribute('aria-label', 'Fermer');
    });

    it('displays correct English dismiss label for info variant', () => {
      renderWithI18n(<InlineAlert variant="info" dismissible>Info message</InlineAlert>, { language: 'en' });
      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss');
    });

    it('displays correct French dismiss label for error variant', () => {
      renderWithI18n(<InlineAlert variant="error" dismissible>Error message</InlineAlert>, { language: 'fr' });
      const dismissButton = screen.getByRole('button');
      expect(dismissButton).toHaveAttribute('aria-label', 'Fermer');
    });
  });
});
