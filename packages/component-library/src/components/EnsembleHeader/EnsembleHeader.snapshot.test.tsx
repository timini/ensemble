import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EnsembleHeader } from './EnsembleHeader';

describe('EnsembleHeader Snapshots', () => {
  it('matches snapshot for default header', () => {
    const { container } = render(<EnsembleHeader />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
