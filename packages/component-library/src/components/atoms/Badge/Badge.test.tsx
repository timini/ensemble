import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders badge with text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies variant data attribute correctly', () => {
    const { rerender } = render(<Badge variant="default">Default</Badge>);
    expect(screen.getByText('Default')).toHaveAttribute('data-variant', 'default');

    rerender(<Badge variant="secondary">Secondary</Badge>);
    expect(screen.getByText('Secondary')).toHaveAttribute('data-variant', 'secondary');

    rerender(<Badge variant="destructive">Destructive</Badge>);
    expect(screen.getByText('Destructive')).toHaveAttribute('data-variant', 'destructive');

    rerender(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText('Outline')).toHaveAttribute('data-variant', 'outline');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    expect(screen.getByText('Custom')).toHaveClass('custom-badge');
  });

  it('renders with default variant when no variant is specified', () => {
    render(<Badge>Default Badge</Badge>);
    expect(screen.getByText('Default Badge')).toHaveAttribute('data-variant', 'default');
  });

  it('renders as inline element', () => {
    render(<Badge>Inline Badge</Badge>);
    expect(screen.getByText('Inline Badge')).toBeInTheDocument();
  });

  describe('snapshots', () => {
    it('matches snapshot for default variant', () => {
      const { container } = render(<Badge>Default</Badge>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for secondary variant', () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for destructive variant', () => {
      const { container } = render(<Badge variant="destructive">Error</Badge>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for outline variant', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with custom className', () => {
      const { container } = render(<Badge className="text-lg">Custom</Badge>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
