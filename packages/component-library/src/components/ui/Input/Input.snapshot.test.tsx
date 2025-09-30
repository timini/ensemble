import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Input } from './Input';

describe('Input Snapshots', () => {
  it('matches snapshot for default input', () => {
    const { container } = render(<Input placeholder="Enter text" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for email input', () => {
    const { container } = render(<Input type="email" placeholder="Email" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for password input', () => {
    const { container } = render(<Input type="password" placeholder="Password" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for disabled input', () => {
    const { container } = render(<Input disabled placeholder="Disabled" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
