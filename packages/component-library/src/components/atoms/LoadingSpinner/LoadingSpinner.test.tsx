import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('renders with default size', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.firstChild).toHaveAttribute('data-size', 'default');
    });

    it('renders with small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      expect(container.firstChild).toHaveAttribute('data-size', 'sm');
    });

    it('renders with large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      expect(container.firstChild).toHaveAttribute('data-size', 'lg');
    });

    it('renders with default variant', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.firstChild).toHaveAttribute('data-variant', 'default');
    });

    it('renders with primary variant', () => {
      const { container } = render(<LoadingSpinner variant="primary" />);
      expect(container.firstChild).toHaveAttribute('data-variant', 'primary');
    });

    it('renders with muted variant', () => {
      const { container } = render(<LoadingSpinner variant="muted" />);
      expect(container.firstChild).toHaveAttribute('data-variant', 'muted');
    });

    it('applies custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('custom-class');
    });

    it('has spin animation', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('accessibility', () => {
    it('has role="status" by default', () => {
      const { container } = render(<LoadingSpinner />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveAttribute('role', 'status');
    });

    it('has aria-live="polite" by default', () => {
      const { container } = render(<LoadingSpinner />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveAttribute('aria-live', 'polite');
    });

    it('accepts aria-label', () => {
      const { container } = render(<LoadingSpinner aria-label="Loading content" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveAttribute('aria-label', 'Loading content');
    });

    it('can override role', () => {
      const { container } = render(<LoadingSpinner role="progressbar" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveAttribute('role', 'progressbar');
    });
  });

  describe('snapshots', () => {
    it('matches snapshot for default variant', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for primary variant', () => {
      const { container } = render(<LoadingSpinner variant="primary" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
