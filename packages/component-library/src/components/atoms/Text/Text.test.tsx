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
      expect(text).toHaveAttribute('data-variant', 'body');
    });

    it('renders helper variant', () => {
      render(<Text variant="helper">Helper text</Text>);
      const text = screen.getByText('Helper text');
      expect(text).toHaveAttribute('data-variant', 'helper');
    });

    it('renders caption variant', () => {
      render(<Text variant="caption">Caption text</Text>);
      const text = screen.getByText('Caption text');
      expect(text).toHaveAttribute('data-variant', 'caption');
    });

    it('renders small variant', () => {
      render(<Text variant="small">Small text</Text>);
      const text = screen.getByText('Small text');
      expect(text).toHaveAttribute('data-variant', 'small');
    });
  });

  describe('color prop', () => {
    it('uses default color when not specified', () => {
      render(<Text>Default</Text>);
      const text = screen.getByText('Default');
      expect(text).toHaveAttribute('data-color', 'default');
    });

    it('renders muted color', () => {
      render(<Text color="muted">Muted text</Text>);
      const text = screen.getByText('Muted text');
      expect(text).toHaveAttribute('data-color', 'muted');
    });

    it('renders error color', () => {
      render(<Text color="error">Error text</Text>);
      const text = screen.getByText('Error text');
      expect(text).toHaveAttribute('data-color', 'error');
    });

    it('renders success color', () => {
      render(<Text color="success">Success text</Text>);
      const text = screen.getByText('Success text');
      expect(text).toHaveAttribute('data-color', 'success');
    });

    it('renders warning color', () => {
      render(<Text color="warning">Warning text</Text>);
      const text = screen.getByText('Warning text');
      expect(text).toHaveAttribute('data-color', 'warning');
    });

    it('renders primary color', () => {
      render(<Text color="primary">Primary text</Text>);
      const text = screen.getByText('Primary text');
      expect(text).toHaveAttribute('data-color', 'primary');
    });
  });

  describe('variant and color combinations', () => {
    it('combines helper variant with error color', () => {
      render(<Text variant="helper" color="error">Error helper</Text>);
      const text = screen.getByText('Error helper');
      expect(text).toHaveAttribute('data-variant', 'helper');
      expect(text).toHaveAttribute('data-color', 'error');
    });

    it('combines caption variant with muted color', () => {
      render(<Text variant="caption" color="muted">Muted caption</Text>);
      const text = screen.getByText('Muted caption');
      expect(text).toHaveAttribute('data-variant', 'caption');
      expect(text).toHaveAttribute('data-color', 'muted');
    });

    it('combines small variant with success color', () => {
      render(<Text variant="small" color="success">Success small</Text>);
      const text = screen.getByText('Success small');
      expect(text).toHaveAttribute('data-variant', 'small');
      expect(text).toHaveAttribute('data-color', 'success');
    });
  });

  describe('as prop with variants', () => {
    it('renders span with body variant', () => {
      const { container } = render(<Text as="span" variant="body">Span body</Text>);
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span).toHaveAttribute('data-variant', 'body');
    });

    it('renders span with helper variant and error color', () => {
      const { container } = render(
        <Text as="span" variant="helper" color="error">Error span</Text>
      );
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span).toHaveAttribute('data-variant', 'helper');
      expect(span).toHaveAttribute('data-color', 'error');
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
    it('merges custom className with variant', () => {
      render(<Text variant="helper" className="font-bold">Bold helper</Text>);
      const text = screen.getByText('Bold helper');
      expect(text).toHaveAttribute('data-variant', 'helper');
      expect(text).toHaveClass('font-bold');
    });

    it('merges custom className with color', () => {
      render(<Text color="error" className="underline">Underlined error</Text>);
      const text = screen.getByText('Underlined error');
      expect(text).toHaveAttribute('data-color', 'error');
      expect(text).toHaveClass('underline');
    });
  });
});
