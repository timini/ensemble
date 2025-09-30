import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnsembleHeader } from './EnsembleHeader';

describe('EnsembleHeader', () => {
  it('renders the header with title', () => {
    render(<EnsembleHeader />);
    expect(screen.getByText('Ensemble AI')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<EnsembleHeader />);
    expect(screen.getByText('The smartest AI is an ensemble.')).toBeInTheDocument();
  });

  it('renders the settings icon', () => {
    render(<EnsembleHeader />);
    const settingsIcon = screen.getByRole('img', { hidden: true });
    expect(settingsIcon).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<EnsembleHeader />);
    const header = container.firstChild;
    expect(header).toHaveClass('bg-white', 'border-b');
  });

  describe('snapshots', () => {
    it('matches snapshot for default render', () => {
      const { container } = render(<EnsembleHeader />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
