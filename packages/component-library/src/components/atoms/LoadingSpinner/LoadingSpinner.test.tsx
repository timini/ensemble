import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('renders with default size', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('renders with small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-3', 'w-3');
    });

    it('renders with large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('renders with default variant', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('text-foreground');
    });

    it('renders with primary variant', () => {
      const { container } = render(<LoadingSpinner variant="primary" />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('text-primary');
    });

    it('renders with muted variant', () => {
      const { container } = render(<LoadingSpinner variant="muted" />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('text-muted-foreground');
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
