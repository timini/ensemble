import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from './Text';

describe('Text', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(<Text>Hello World</Text>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders as paragraph by default', () => {
      const { container } = render(<Text>Paragraph text</Text>);
      const paragraph = container.querySelector('p');
      expect(paragraph).toBeInTheDocument();
      expect(paragraph).toHaveTextContent('Paragraph text');
    });

    it('renders as span when as="span"', () => {
      const { container } = render(<Text as="span">Span text</Text>);
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span).toHaveTextContent('Span text');
    });

    it('applies custom className', () => {
      render(<Text className="custom-class">Text</Text>);
      const text = screen.getByText('Text');
      expect(text).toHaveClass('custom-class');
    });

    it('forwards ref', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<Text ref={ref}>Text</Text>);
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });

    it('passes through HTML attributes', () => {
      render(<Text data-testid="test-text" aria-label="Test">Text</Text>);
      const text = screen.getByTestId('test-text');
      expect(text).toHaveAttribute('aria-label', 'Test');
    });
  });

  describe('variant prop', () => {
    it('renders body variant by default', () => {
      render(<Text>Body text</Text>);
      const text = screen.getByText('Body text');
      expect(text).toHaveClass('text-base', 'text-gray-900');
    });

    it('renders helper variant', () => {
      render(<Text variant="helper">Helper text</Text>);
      const text = screen.getByText('Helper text');
      expect(text).toHaveClass('text-sm', 'text-gray-600');
    });

    it('renders caption variant', () => {
      render(<Text variant="caption">Caption text</Text>);
      const text = screen.getByText('Caption text');
      expect(text).toHaveClass('text-xs', 'text-gray-500');
    });

    it('renders small variant', () => {
      render(<Text variant="small">Small text</Text>);
      const text = screen.getByText('Small text');
      expect(text).toHaveClass('text-sm', 'text-gray-900');
    });
  });

  describe('color prop', () => {
    it('uses default color when not specified', () => {
      render(<Text>Default</Text>);
      const text = screen.getByText('Default');
      expect(text).toHaveClass('text-gray-900');
    });

    it('renders muted color', () => {
      render(<Text color="muted">Muted text</Text>);
      const text = screen.getByText('Muted text');
      expect(text).toHaveClass('text-gray-500');
    });

    it('renders error color', () => {
      render(<Text color="error">Error text</Text>);
      const text = screen.getByText('Error text');
      expect(text).toHaveClass('text-red-600');
    });

    it('renders success color', () => {
      render(<Text color="success">Success text</Text>);
      const text = screen.getByText('Success text');
      expect(text).toHaveClass('text-green-600');
    });

    it('renders warning color', () => {
      render(<Text color="warning">Warning text</Text>);
      const text = screen.getByText('Warning text');
      expect(text).toHaveClass('text-yellow-600');
    });

    it('renders primary color', () => {
      render(<Text color="primary">Primary text</Text>);
      const text = screen.getByText('Primary text');
      expect(text).toHaveClass('text-blue-600');
    });
  });

  describe('variant and color combinations', () => {
    it('combines helper variant with error color', () => {
      render(<Text variant="helper" color="error">Error helper</Text>);
      const text = screen.getByText('Error helper');
      expect(text).toHaveClass('text-sm', 'text-red-600');
    });

    it('combines caption variant with muted color', () => {
      render(<Text variant="caption" color="muted">Muted caption</Text>);
      const text = screen.getByText('Muted caption');
      expect(text).toHaveClass('text-xs', 'text-gray-500');
    });

    it('combines small variant with success color', () => {
      render(<Text variant="small" color="success">Success small</Text>);
      const text = screen.getByText('Success small');
      expect(text).toHaveClass('text-sm', 'text-green-600');
    });
  });

  describe('as prop with variants', () => {
    it('renders span with body variant', () => {
      const { container } = render(<Text as="span" variant="body">Span body</Text>);
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span).toHaveClass('text-base', 'text-gray-900');
    });

    it('renders span with helper variant and error color', () => {
      const { container } = render(
        <Text as="span" variant="helper" color="error">Error span</Text>
      );
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span).toHaveClass('text-sm', 'text-red-600');
    });
  });

  describe('accessibility', () => {
    it('maintains semantic HTML with paragraph', () => {
      const { container } = render(<Text>Accessible text</Text>);
      const paragraph = container.querySelector('p');
      expect(paragraph).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      render(<Text aria-describedby="description">Text</Text>);
      const text = screen.getByText('Text');
      expect(text).toHaveAttribute('aria-describedby', 'description');
    });

    it('supports role attribute', () => {
      render(<Text role="status">Status text</Text>);
      const text = screen.getByText('Status text');
      expect(text).toHaveAttribute('role', 'status');
    });
  });

  describe('className merging', () => {
    it('merges custom className with variant classes', () => {
      render(<Text variant="helper" className="font-bold">Bold helper</Text>);
      const text = screen.getByText('Bold helper');
      expect(text).toHaveClass('text-sm', 'text-gray-600', 'font-bold');
    });

    it('merges custom className with color classes', () => {
      render(<Text color="error" className="underline">Underlined error</Text>);
      const text = screen.getByText('Underlined error');
      expect(text).toHaveClass('text-red-600', 'underline');
    });
  });
});
