import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndpointInput, type EndpointInputValue } from './EndpointInput';

const ollama: EndpointInputValue = {
  id: 'ollama',
  presetId: 'ollama',
  label: 'Ollama',
  baseURL: 'http://localhost:11434/v1',
  apiKey: '',
  embeddingModel: 'nomic-embed-text',
  status: 'valid',
  modelCount: 3,
  local: true,
  requiresKey: false,
};

describe('EndpointInput', () => {
  it('shows the label, logo, local badge and fields', () => {
    render(<EndpointInput endpoint={ollama} onChange={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByTestId('endpoint-ollama')).toHaveAttribute('data-status', 'valid');
    expect(screen.getByText('Ollama')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-logo-ollama')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-ollama-local')).toHaveTextContent('Local');
    expect(screen.getByTestId('endpoint-ollama-base-url')).toHaveValue('http://localhost:11434/v1');
    expect(screen.getByTestId('endpoint-ollama-embedding-model')).toHaveValue('nomic-embed-text');
    expect(screen.getByLabelText('API key (optional)')).toBeInTheDocument();
  });

  it('says how many models a connected endpoint has', () => {
    render(<EndpointInput endpoint={ollama} onChange={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByTestId('endpoint-ollama-status')).toHaveTextContent('Connected. 3 models available.');
  });

  it('shows the error of an endpoint that could not be reached', () => {
    render(
      <EndpointInput
        endpoint={{ ...ollama, status: 'invalid', error: 'Failed to fetch' }}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId('endpoint-ollama-status')).toHaveTextContent('Could not connect: Failed to fetch');
  });

  it('translates the error of a check that failed before reaching the server', () => {
    render(
      <EndpointInput
        endpoint={{ ...ollama, status: 'invalid', errorCode: 'baseUrlRequired' }}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId('endpoint-ollama-status')).toHaveTextContent('Could not connect: Base URL is required.');
  });

  it('warns when the embedding model is not in the server list', () => {
    const lmstudio = { ...ollama, id: 'lmstudio', presetId: 'lmstudio' as const, label: 'LM Studio' };
    const { rerender } = render(
      <EndpointInput endpoint={{ ...lmstudio, embeddingModelFound: false }} onChange={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(screen.getByTestId('endpoint-lmstudio-embedding-missing')).toHaveTextContent(
      'nomic-embed-text is not in this server',
    );
    expect(screen.queryByTestId('endpoint-lmstudio-embedding-pull')).not.toBeInTheDocument();
    rerender(<EndpointInput endpoint={{ ...lmstudio, embeddingModelFound: true }} onChange={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.queryByTestId('endpoint-lmstudio-embedding-missing')).not.toBeInTheDocument();
  });

  it('gives the exact ollama pull command when Ollama has no embedding model', () => {
    const { rerender } = render(
      <EndpointInput endpoint={{ ...ollama, embeddingModelFound: false }} onChange={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(screen.getByTestId('endpoint-ollama-embedding-missing')).toHaveTextContent(
      'nomic-embed-text is not installed',
    );
    expect(screen.getByTestId('endpoint-ollama-embedding-pull-command')).toHaveTextContent(
      'ollama pull nomic-embed-text',
    );
    rerender(
      <EndpointInput
        endpoint={{ ...ollama, embeddingModel: '', embeddingModelFound: false }}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId('endpoint-ollama-embedding-pull-command')).toHaveTextContent(
      'ollama pull nomic-embed-text',
    );
  });

  it('explains a call the browser blocked and gives the local run command', () => {
    render(
      <EndpointInput
        endpoint={{ ...ollama, status: 'invalid', errorCode: 'localBlocked' }}
        localRunCommand="npm run local"
        guideUrl="https://example.com/guide"
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByTestId('endpoint-ollama-status')).toHaveTextContent(
      'Could not connect: Your browser did not let this site reach a server on your computer.',
    );
    expect(screen.getByTestId('endpoint-ollama-local-help')).toHaveAttribute('data-reason', 'blocked');
    expect(screen.getByTestId('endpoint-ollama-local-help-command-command')).toHaveTextContent('npm run local');
  });

  it('shows no local run help for other failures', () => {
    render(
      <EndpointInput
        endpoint={{ ...ollama, status: 'invalid', errorCode: 'unreachable' }}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('endpoint-ollama-local-help')).not.toBeInTheDocument();
  });

  it('translates the name of a Custom endpoint and keeps its number', () => {
    render(
      <EndpointInput
        endpoint={{ ...ollama, id: 'custom-2', presetId: 'custom', label: 'Custom 2', local: false }}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('Custom 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Custom 2' })).toBeInTheDocument();
  });

  it('labels the key as required for hosted endpoints and hides it by default', () => {
    render(
      <EndpointInput
        endpoint={{ ...ollama, id: 'groq', presetId: 'groq', label: 'Groq', local: false, requiresKey: true, apiKey: 'gsk_1' }}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('API key')).toHaveAttribute('type', 'password');
    expect(screen.queryByTestId('endpoint-groq-local')).not.toBeInTheDocument();
  });

  it('reports field edits', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EndpointInput endpoint={{ ...ollama, baseURL: '' }} onChange={onChange} onRemove={vi.fn()} />);
    await user.type(screen.getByTestId('endpoint-ollama-base-url'), 'h');
    expect(onChange).toHaveBeenCalledWith('baseURL', 'h');
    await user.type(screen.getByTestId('endpoint-ollama-api-key'), 'k');
    expect(onChange).toHaveBeenCalledWith('apiKey', 'k');
  });

  it('toggles key visibility and removes the endpoint', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<EndpointInput endpoint={ollama} onChange={vi.fn()} onRemove={onRemove} />);
    const key = screen.getByTestId('endpoint-ollama-api-key');
    expect(key).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show API key' }));
    expect(key).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Remove Ollama' }));
    expect(onRemove).toHaveBeenCalled();
  });
});
