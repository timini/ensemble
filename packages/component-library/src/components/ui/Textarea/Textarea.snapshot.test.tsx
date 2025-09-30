import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Textarea } from './Textarea';

describe('Textarea Snapshots', () => {
  it('matches snapshot for default textarea', () => {
    const { container } = render(<Textarea placeholder="Enter message" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for disabled textarea', () => {
    const { container } = render(<Textarea disabled placeholder="Disabled" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for textarea with custom height', () => {
    const { container } = render(
      <Textarea className="min-h-[200px]" placeholder="Tall textarea" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
