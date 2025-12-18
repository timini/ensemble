import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading } from './Heading';

describe('Heading', () => {
  describe('rendering', () => {
    it('renders h1 when level is 1', () => {
      render(<Heading level={1}>Heading 1</Heading>);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });

    it('renders h2 when level is 2', () => {
      render(<Heading level={2}>Heading 2</Heading>);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
    });

    it('renders h3 when level is 3', () => {
      render(<Heading level={3}>Heading 3</Heading>);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    it('renders h4 when level is 4', () => {
      render(<Heading level={4}>Heading 4</Heading>);

      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H4');
    });

    it('renders h5 when level is 5', () => {
      render(<Heading level={5}>Heading 5</Heading>);

      const heading = screen.getByRole('heading', { level: 5 });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H5');
    });

    it('renders h6 when level is 6', () => {
      render(<Heading level={6}>Heading 6</Heading>);

      const heading = screen.getByRole('heading', { level: 6 });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H6');
    });

    it('renders children correctly', () => {
      render(<Heading level={2}>Test Content</Heading>);

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders with complex children', () => {
      render(
        <Heading level={2}>
          <span>Complex</span> <strong>Content</strong>
        </Heading>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe('Complex Content');
    });
  });

  describe('size variants', () => {
    it('applies xs size class', () => {
      render(<Heading level={3} size="xs">Small</Heading>);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('text-xs');
    });

    it('applies sm size class', () => {
      render(<Heading level={3} size="sm">Small</Heading>);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('text-sm');
    });

    it('applies md size class', () => {
      render(<Heading level={3} size="md">Medium</Heading>);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('text-base');
    });

    it('applies lg size class (default)', () => {
      render(<Heading level={3}>Large</Heading>);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('text-lg');
    });

    it('applies xl size class', () => {
      render(<Heading level={3} size="xl">Extra Large</Heading>);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('text-xl');
    });

    it('applies 2xl size class', () => {
      render(<Heading level={3} size="2xl">2X Large</Heading>);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('text-2xl');
    });

    it('applies 3xl size class', () => {
      render(<Heading level={1} size="3xl">3X Large</Heading>);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-3xl', 'font-bold');
    });
  });

  describe('styling', () => {
    it('applies base classes', () => {
      render(<Heading level={2}>Heading</Heading>);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveClass('font-semibold', 'text-gray-900');
    });

    it('applies custom className', () => {
      render(
        <Heading level={2} className="custom-class">
          Heading
        </Heading>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveClass('custom-class');
    });

    it('merges custom className with variant classes', () => {
      render(
        <Heading level={2} size="xl" className="mb-4">
          Heading
        </Heading>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveClass('text-xl', 'mb-4', 'font-semibold');
    });
  });

  describe('semantic vs visual separation', () => {
    it('can render h1 with small visual size', () => {
      render(
        <Heading level={1} size="sm">
          Small H1
        </Heading>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.tagName).toBe('H1');
      expect(heading).toHaveClass('text-sm');
    });

    it('can render h6 with large visual size', () => {
      render(
        <Heading level={6} size="3xl">
          Large H6
        </Heading>
      );

      const heading = screen.getByRole('heading', { level: 6 });
      expect(heading.tagName).toBe('H6');
      expect(heading).toHaveClass('text-3xl');
    });

    it('can render h2 with 3xl size', () => {
      render(
        <Heading level={2} size="3xl">
          Page Title
        </Heading>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.tagName).toBe('H2');
      expect(heading).toHaveClass('text-3xl', 'font-bold');
    });
  });

  describe('HTML attributes', () => {
    it('forwards id attribute', () => {
      render(
        <Heading level={2} id="test-id">
          Heading
        </Heading>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveAttribute('id', 'test-id');
    });

    it('forwards data attributes', () => {
      render(
        <Heading level={2} data-testid="custom-heading">
          Heading
        </Heading>
      );

      expect(screen.getByTestId('custom-heading')).toBeInTheDocument();
    });

    it('forwards aria attributes', () => {
      render(
        <Heading level={2} aria-label="Custom Label">
          Heading
        </Heading>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveAttribute('aria-label', 'Custom Label');
    });
  });

  describe('accessibility', () => {
    it('maintains proper heading hierarchy in DOM', () => {
      render(
        <>
          <Heading level={1}>Main Title</Heading>
          <Heading level={2}>Section Title</Heading>
          <Heading level={3}>Subsection Title</Heading>
        </>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('is accessible by screen readers', () => {
      render(<Heading level={2}>Accessible Heading</Heading>);

      const heading = screen.getByRole('heading', { name: 'Accessible Heading' });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty children', () => {
      render(<Heading level={2}>{null}</Heading>);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toBe('');
    });

    it('handles long text content', () => {
      const longText = 'This is a very long heading that might wrap to multiple lines in the UI';
      render(<Heading level={2}>{longText}</Heading>);

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('handles special characters', () => {
      render(<Heading level={2}>Heading with @#$%^&* characters</Heading>);

      expect(screen.getByText(/Heading with @#\$%\^&\* characters/)).toBeInTheDocument();
    });
  });
});
