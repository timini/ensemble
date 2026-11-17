import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndpointConfiguration, type EndpointPresetOption } from './EndpointConfiguration';
import type { EndpointInputValue } from '../../molecules/EndpointInput';

const presets: EndpointPresetOption[] = [
  { id: 'ollama', label: 'Ollama' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'custom', label: 'Custom' },
];

const endpoint: EndpointInputValue = {
  id: 'ollama',
  presetId: 'ollama',
  label: 'Ollama',
  baseURL: 'http://localhost:11434/v1',
  apiKey: '',
  embeddingModel: '',
  status: 'idle',
  local: true,
  requiresKey: false,
};

describe('EndpointConfiguration', () => {
  it('shows a heading and an empty state', () => {
    render(<EndpointConfiguration endpoints={[]} presets={presets} onAdd={vi.fn()} onChange={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'OpenAI-compatible endpoints' })).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-configuration-empty')).toBeInTheDocument();
  });

  it('offers one add button per preset', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<EndpointConfiguration endpoints={[]} presets={presets} onAdd={onAdd} onChange={vi.fn()} onRemove={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Add endpoint' });
    expect(within(group).getAllByRole('button')).toHaveLength(3);
    await user.click(screen.getByTestId('add-endpoint-openrouter'));
    expect(onAdd).toHaveBeenCalledWith('openrouter');
  });

  it('lists the endpoints and passes edits and removals with the endpoint id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onRemove = vi.fn();
    render(
      <EndpointConfiguration endpoints={[endpoint]} presets={presets} onAdd={vi.fn()} onChange={onChange} onRemove={onRemove} />,
    );
    expect(screen.queryByTestId('endpoint-configuration-empty')).not.toBeInTheDocument();
    await user.type(screen.getByTestId('endpoint-ollama-embedding-model'), 'n');
    expect(onChange).toHaveBeenCalledWith('ollama', 'embeddingModel', 'n');
    await user.click(screen.getByTestId('endpoint-ollama-remove'));
    expect(onRemove).toHaveBeenCalledWith('ollama');
  });
});
