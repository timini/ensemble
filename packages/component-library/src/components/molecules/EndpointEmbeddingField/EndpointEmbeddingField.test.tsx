import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndpointEmbeddingField } from './EndpointEmbeddingField';

describe('EndpointEmbeddingField', () => {
  it('shows the model and no note when the server has it', () => {
    render(<EndpointEmbeddingField endpointId="ollama" presetId="ollama" value="nomic-embed-text" missing={false} onChange={vi.fn()} />);
    expect(screen.getByTestId('endpoint-ollama-embedding-model')).toHaveValue('nomic-embed-text');
    expect(screen.getByLabelText('Embedding model (optional)')).toBeInTheDocument();
    expect(screen.queryByTestId('endpoint-ollama-embedding-missing')).not.toBeInTheDocument();
  });

  it('gives the ollama pull command for a missing model', () => {
    render(<EndpointEmbeddingField endpointId="ollama" presetId="ollama" value="embeddinggemma" missing onChange={vi.fn()} />);
    expect(screen.getByTestId('endpoint-ollama-embedding-missing')).toHaveTextContent('embeddinggemma is not installed');
    expect(screen.getByTestId('endpoint-ollama-embedding-pull-command')).toHaveTextContent('ollama pull embeddinggemma');
  });

  it('suggests nomic-embed-text when Ollama has no model set', () => {
    render(<EndpointEmbeddingField endpointId="ollama" presetId="ollama" value=" " missing onChange={vi.fn()} />);
    expect(screen.getByTestId('endpoint-ollama-embedding-pull-command')).toHaveTextContent('ollama pull nomic-embed-text');
  });

  it('only notes a missing model on other servers, and nothing when none is set', () => {
    const { rerender } = render(
      <EndpointEmbeddingField endpointId="vllm" presetId="vllm" value="bge-m3" missing onChange={vi.fn()} />,
    );
    expect(screen.getByTestId('endpoint-vllm-embedding-missing')).toHaveTextContent('bge-m3 is not in this server');
    expect(screen.queryByTestId('endpoint-vllm-embedding-pull')).not.toBeInTheDocument();
    rerender(<EndpointEmbeddingField endpointId="vllm" presetId="vllm" value="" missing onChange={vi.fn()} />);
    expect(screen.queryByTestId('endpoint-vllm-embedding-missing')).not.toBeInTheDocument();
  });

  it('reports edits', async () => {
    const onChange = vi.fn();
    render(<EndpointEmbeddingField endpointId="ollama" presetId="ollama" value="" missing={false} onChange={onChange} />);
    await userEvent.type(screen.getByTestId('endpoint-ollama-embedding-model'), 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });
});
