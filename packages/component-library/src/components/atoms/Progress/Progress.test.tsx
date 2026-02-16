import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './Progress';

describe('Progress', () => {
  it('renders with default value', () => {
    render(<Progress data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute('role', 'progressbar');
  });

  it('displays correct aria attributes', () => {
    render(<Progress value={50} max={100} data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuenow', '50');
  });

  it('calculates percentage correctly', () => {
    const { container } = render(<Progress value={75} max={100} />);
    const progress = container.firstChild as HTMLElement;
    const indicator = progress.firstChild as HTMLElement;
    expect(indicator).toBeTruthy();
    expect(indicator.style.width).toBe('75%');
  });

  it('handles zero value', () => {
    const { container } = render(<Progress value={0} max={100} />);
    const progress = container.firstChild as HTMLElement;
    const indicator = progress.firstChild as HTMLElement;
    expect(indicator.style.width).toBe('0%');
  });

  it('handles max value', () => {
    const { container } = render(<Progress value={100} max={100} />);
    const progress = container.firstChild as HTMLElement;
    const indicator = progress.firstChild as HTMLElement;
    expect(indicator.style.width).toBe('100%');
  });

  it('caps value at 100%', () => {
    const { container } = render(<Progress value={150} max={100} />);
    const progress = container.firstChild as HTMLElement;
    const indicator = progress.firstChild as HTMLElement;
    expect(indicator.style.width).toBe('100%');
  });

  it('floors value at 0%', () => {
    const { container } = render(<Progress value={-10} max={100} />);
    const progress = container.firstChild as HTMLElement;
    const indicator = progress.firstChild as HTMLElement;
    expect(indicator.style.width).toBe('0%');
  });

  it('renders destructive variant', () => {
    const { container } = render(<Progress variant="destructive" value={50} />);
    const progress = container.firstChild as HTMLElement;
    expect(progress).toHaveAttribute('data-variant', 'destructive');
  });

  it('renders success variant', () => {
    const { container } = render(<Progress variant="success" value={50} />);
    const progress = container.firstChild as HTMLElement;
    expect(progress).toHaveAttribute('data-variant', 'success');
  });

  it('renders warning variant', () => {
    const { container } = render(<Progress variant="warning" value={50} />);
    const progress = container.firstChild as HTMLElement;
    expect(progress).toHaveAttribute('data-variant', 'warning');
  });

  it('applies custom className', () => {
    render(<Progress className="h-4" data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveClass('h-4');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={50} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('works with custom max value', () => {
    const { container } = render(<Progress value={50} max={200} />);
    const progress = container.firstChild as HTMLElement;
    const indicator = progress.firstChild as HTMLElement;
    expect(indicator.style.width).toBe('25%');
  });

  describe('snapshots', () => {
    it('matches snapshot for default variant', () => {
      const { container } = render(<Progress value={50} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for destructive variant', () => {
      const { container } = render(<Progress variant="destructive" value={75} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for success variant', () => {
      const { container } = render(<Progress variant="success" value={100} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot for warning variant', () => {
      const { container } = render(<Progress variant="warning" value={25} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot with custom className', () => {
      const { container } = render(<Progress value={60} className="h-4" />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches snapshot at 0%', () => {
      const { container } = render(<Progress value={0} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
