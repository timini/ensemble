import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandSnippet } from './CommandSnippet';

describe('CommandSnippet', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the command as code', () => {
    render(<CommandSnippet command="ollama pull nomic-embed-text" data-testid="pull" />);
    expect(screen.getByTestId('pull-command')).toHaveTextContent('ollama pull nomic-embed-text');
    expect(screen.getByTestId('pull-command').tagName).toBe('CODE');
  });

  it('copies the command and says so', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<CommandSnippet command="npm run local" data-testid="run" />);
    await user.click(screen.getByRole('button', { name: 'Copy command' }));
    expect(writeText).toHaveBeenCalledWith('npm run local');
    await waitFor(() => expect(screen.getByTestId('run-copy')).toHaveTextContent('Copied'));
  });

  it('keeps working when the clipboard is not available', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    render(<CommandSnippet command="npm run local" data-testid="run" />);
    await user.click(screen.getByRole('button', { name: 'Copy command' }));
    expect(screen.getByTestId('run-copy')).toHaveTextContent('Copy');
  });
});
