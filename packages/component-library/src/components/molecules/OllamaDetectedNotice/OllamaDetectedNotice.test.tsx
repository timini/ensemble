import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OllamaDetectedNotice, type OllamaDetectedNoticeProps } from './OllamaDetectedNotice';

const base: OllamaDetectedNoticeProps = {
  state: 'found',
  chatModels: ['llama3.2:3b', 'qwen3:4b'],
  embeddingModel: 'nomic-embed-text:latest',
  embeddingPullCommand: 'ollama pull nomic-embed-text',
  chatPullCommand: 'ollama pull llama3.2:3b',
  hosted: false,
  localRunCommand: 'npm run local',
  onAdd: vi.fn(),
  onCheck: vi.fn(),
  onDismiss: vi.fn(),
};

describe('OllamaDetectedNotice', () => {
  it('lists the installed models and adds Ollama with one click', async () => {
    const onAdd = vi.fn();
    render(<OllamaDetectedNotice {...base} onAdd={onAdd} />);
    expect(screen.getByTestId('ollama-notice')).toHaveAttribute('data-state', 'found');
    expect(screen.getByTestId('ollama-notice-models')).toHaveTextContent('2 chat models installed: llama3.2:3b, qwen3:4b.');
    expect(screen.getByTestId('ollama-notice-embedding')).toHaveTextContent('nomic-embed-text:latest');
    await userEvent.click(screen.getByTestId('ollama-notice-add'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('gives the pull command when no embedding model is installed', () => {
    render(<OllamaDetectedNotice {...base} embeddingModel={undefined} />);
    expect(screen.queryByTestId('ollama-notice-embedding')).not.toBeInTheDocument();
    expect(screen.getByTestId('ollama-notice-no-embedding')).toHaveTextContent('no agreement score');
    expect(screen.getByTestId('ollama-notice-embedding-pull-command')).toHaveTextContent('ollama pull nomic-embed-text');
  });

  it('gives a pull command when no chat model is installed', () => {
    render(<OllamaDetectedNotice {...base} chatModels={[]} />);
    expect(screen.getByTestId('ollama-notice-chat-pull-command')).toHaveTextContent('ollama pull llama3.2:3b');
  });

  it('can be dismissed', async () => {
    const onDismiss = vi.fn();
    render(<OllamaDetectedNotice {...base} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByTestId('ollama-notice-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('asks before looking, so the browser permission prompt follows a click', async () => {
    const onCheck = vi.fn();
    render(<OllamaDetectedNotice {...base} state="ask" hosted onCheck={onCheck} />);
    expect(screen.queryByTestId('ollama-notice-add')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('ollama-notice-check'));
    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  it('disables the check while it runs', () => {
    render(<OllamaDetectedNotice {...base} state="checking" hosted />);
    expect(screen.getByTestId('ollama-notice-check')).toBeDisabled();
    expect(screen.getByTestId('ollama-notice-check')).toHaveTextContent('Looking for Ollama...');
  });

  it('suggests the local run when the hosted site could not find Ollama', () => {
    render(<OllamaDetectedNotice {...base} state="notFound" hosted />);
    expect(screen.getByTestId('ollama-notice-help')).toHaveAttribute('data-reason', 'notFound');
    expect(screen.getByTestId('ollama-notice-check')).toHaveTextContent('Look again');
  });

  it('only asks to start Ollama when the app already runs locally', () => {
    render(<OllamaDetectedNotice {...base} state="notFound" hosted={false} />);
    expect(screen.queryByTestId('ollama-notice-help')).not.toBeInTheDocument();
    expect(screen.getByTestId('ollama-notice')).toHaveTextContent('ollama serve');
  });
});
