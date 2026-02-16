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
      expect(container.firstChild).toHaveAttribute('data-variant', 'info');
    });

    it('renders with success variant', () => {
      const { container } = render(<InlineAlert variant="success">Message</InlineAlert>);
      expect(container.firstChild).toHaveAttribute('data-variant', 'success');
    });

    it('renders with warning variant', () => {
      const { container } = render(<InlineAlert variant="warning">Message</InlineAlert>);
      expect(container.firstChild).toHaveAttribute('data-variant', 'warning');
    });

    it('renders with error variant', () => {
      const { container } = render(<InlineAlert variant="error">Message</InlineAlert>);
      expect(container.firstChild).toHaveAttribute('data-variant', 'error');
    });

    it('renders icon for each variant', () => {
      const { container: c1 } = render(<InlineAlert variant="info">Message</InlineAlert>);
      expect(c1.querySelector('svg')).toBeInTheDocument();

      const { container: c2 } = render(<InlineAlert variant="success">Message</InlineAlert>);
      expect(c2.querySelector('svg')).toBeInTheDocument();

      const { container: c3 } = render(<InlineAlert variant="warning">Message</InlineAlert>);
      expect(c3.querySelector('svg')).toBeInTheDocument();

      const { container: c4 } = render(<InlineAlert variant="error">Message</InlineAlert>);
      expect(c4.querySelector('svg')).toBeInTheDocument();
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
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Dismiss');
    });

    it('renders dismiss button with French label', () => {
      renderWithI18n(<InlineAlert dismissible>Message</InlineAlert>, { language: 'fr' });
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Fermer');
    });

    it('displays correct English dismiss label for info variant', () => {
      renderWithI18n(<InlineAlert variant="info" dismissible>Info message</InlineAlert>, { language: 'en' });
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Dismiss');
    });

    it('displays correct French dismiss label for error variant', () => {
      renderWithI18n(<InlineAlert variant="error" dismissible>Error message</InlineAlert>, { language: 'fr' });
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Fermer');
    });
  });
});
