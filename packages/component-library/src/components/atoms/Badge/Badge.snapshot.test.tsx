import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge Snapshots', () => {
  it('matches snapshot for default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for secondary variant', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for destructive variant', () => {
    const { container } = render(<Badge variant="destructive">Destructive</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for outline variant', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
