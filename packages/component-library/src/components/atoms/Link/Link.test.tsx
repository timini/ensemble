import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Link } from './Link';

describe('Link', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(<Link href="/test">Test Link</Link>);
      expect(screen.getByText('Test Link')).toBeInTheDocument();
    });

    it('renders as anchor element', () => {
      render(<Link href="/test">Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
    });

    it('applies href attribute', () => {
      render(<Link href="/about">About</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/about');
    });

    it('applies custom className', () => {
      render(<Link href="/test" className="custom-class">Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLAnchorElement>();
      render(<Link ref={ref} href="/test">Link</Link>);
      expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
    });

    it('passes through HTML attributes', () => {
      render(<Link href="/test" data-testid="test-link" aria-label="Test">Link</Link>);
      const link = screen.getByTestId('test-link');
      expect(link).toHaveAttribute('aria-label', 'Test');
    });
  });

  describe('variant prop', () => {
    it('renders default variant', () => {
      render(<Link href="/test">Default Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-primary', 'hover:text-primary/80', 'underline');
    });

    it('renders subtle variant', () => {
      render(<Link variant="subtle" href="/test">Subtle Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-muted-foreground', 'hover:text-foreground', 'hover:underline');
    });

    it('renders bold variant', () => {
      render(<Link variant="bold" href="/test">Bold Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-primary', 'hover:text-primary/80', 'font-semibold', 'underline');
    });
  });

  describe('external prop', () => {
    it('does not show external icon by default', () => {
      render(<Link href="/test">Internal Link</Link>);
      const icon = screen.queryByLabelText('Opens in new window');
      expect(icon).not.toBeInTheDocument();
    });

    it('shows external icon when external is true', () => {
      render(<Link href="https://example.com" external>External Link</Link>);
      const icon = screen.getByLabelText('Opens in new window');
      expect(icon).toBeInTheDocument();
    });

    it('adds target="_blank" when external is true', () => {
      render(<Link href="https://example.com" external>External Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('adds rel="noopener noreferrer" when external is true', () => {
      render(<Link href="https://example.com" external>External Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not add target or rel for internal links', () => {
      render(<Link href="/test">Internal Link</Link>);
      const link = screen.getByRole('link');
      expect(link).not.toHaveAttribute('target');
      expect(link).not.toHaveAttribute('rel');
    });
  });

  describe('iconSize prop', () => {
    it('uses default icon size of 14', () => {
      render(<Link href="https://example.com" external>External</Link>);
      const icon = screen.getByLabelText('Opens in new window');
      expect(icon).toHaveAttribute('width', '14');
      expect(icon).toHaveAttribute('height', '14');
    });

    it('applies custom icon size', () => {
      render(<Link href="https://example.com" external iconSize={20}>External</Link>);
      const icon = screen.getByLabelText('Opens in new window');
      expect(icon).toHaveAttribute('width', '20');
      expect(icon).toHaveAttribute('height', '20');
    });
  });

  describe('accessibility', () => {
    it('has link role', () => {
      render(<Link href="/test">Accessible Link</Link>);
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      render(<Link href="/test" aria-describedby="description">Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-describedby', 'description');
    });

    it('has focus ring styles', () => {
      render(<Link href="/test">Focusable Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-ring');
    });

    it('includes accessible label for external icon', () => {
      render(<Link href="https://example.com" external>External</Link>);
      expect(screen.getByLabelText('Opens in new window')).toBeInTheDocument();
    });
  });

  describe('className merging', () => {
    it('merges custom className with variant classes', () => {
      render(<Link variant="default" className="font-bold" href="/test">Custom Link</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-primary', 'font-bold');
    });

    it('merges custom className with external link classes', () => {
      render(<Link external className="text-lg" href="https://example.com">Large External</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-lg');
    });
  });

  describe('navigation', () => {
    it('renders with relative path', () => {
      render(<Link href="/about">About</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/about');
    });

    it('renders with absolute URL', () => {
      render(<Link href="https://example.com">Example</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('renders with hash link', () => {
      render(<Link href="#section">Jump to section</Link>);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '#section');
    });
  });
});
