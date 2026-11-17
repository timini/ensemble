import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocalServerHelp } from './LocalServerHelp';

const GUIDE = 'https://example.com/LOCAL_MODELS.md';

describe('LocalServerHelp', () => {
  it('explains a blocked call and gives the local run command and guide', () => {
    render(<LocalServerHelp reason="blocked" localRunCommand="npm run local" guideUrl={GUIDE} />);
    expect(screen.getByTestId('local-server-help')).toHaveAttribute('data-reason', 'blocked');
    expect(screen.getByTestId('local-server-help')).toHaveTextContent(/Safari blocks/);
    expect(screen.getByTestId('local-server-help-command-command')).toHaveTextContent('npm run local');
    expect(screen.getByRole('link', { name: 'Local models guide' })).toHaveAttribute('href', GUIDE);
  });

  it('explains that Ollama may be missing or blocked', () => {
    render(<LocalServerHelp reason="notFound" localRunCommand="npm run local" data-testid="help" />);
    expect(screen.getByTestId('help')).toHaveTextContent(/Start Ollama/);
    expect(screen.getByTestId('help-command-command')).toHaveTextContent('npm run local');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('opens the guide in a new tab safely', () => {
    render(<LocalServerHelp reason="blocked" localRunCommand="npm run local" guideUrl={GUIDE} />);
    const link = screen.getByRole('link', { name: 'Local models guide' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
