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
