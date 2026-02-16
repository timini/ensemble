import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './Label';

describe('Label', () => {
  it('renders with text content', () => {
    render(<Label>Email Address</Label>);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Label className="text-red-500">Custom Label</Label>);
    const label = screen.getByText('Custom Label');
    expect(label).toHaveClass('text-red-500');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Label Text</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('associates with form control via htmlFor', () => {
    render(
      <div>
        <Label htmlFor="email-input">Email</Label>
        <input id="email-input" type="email" />
      </div>
    );
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('renders as label element', () => {
    render(<Label>Styled Label</Label>);
    const label = screen.getByText('Styled Label');
    expect(label.tagName).toBe('LABEL');
  });

  it('supports standard label attributes', () => {
    render(<Label data-testid="custom-label">Test Label</Label>);
    expect(screen.getByTestId('custom-label')).toBeInTheDocument();
  });

  describe('snapshots', () => {
    it('matches snapshot for basic label', () => {
      const { container } = render(<Label>Email Address</Label>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with htmlFor', () => {
      const { container } = render(<Label htmlFor="email-input">Email</Label>);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with custom className', () => {
      const { container } = render(<Label className="text-red-500">Custom Label</Label>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
