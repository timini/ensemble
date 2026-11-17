import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { EndpointConfiguration, type EndpointPresetOption } from './EndpointConfiguration';
import type { EndpointInputValue } from '../../molecules/EndpointInput';

const presets: EndpointPresetOption[] = [
  { id: 'ollama', label: 'Ollama' },
  { id: 'lmstudio', label: 'LM Studio' },
  { id: 'llamacpp', label: 'llama.cpp server' },
  { id: 'vllm', label: 'vLLM' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'groq', label: 'Groq' },
  { id: 'together', label: 'Together AI' },
  { id: 'custom', label: 'Custom' },
];

const ollama: EndpointInputValue = {
  id: 'ollama',
  presetId: 'ollama',
  label: 'Ollama',
  baseURL: 'http://localhost:11434/v1',
  apiKey: '',
  embeddingModel: 'nomic-embed-text',
  status: 'valid',
  modelCount: 4,
  local: true,
  requiresKey: false,
};

const openrouter: EndpointInputValue = {
  id: 'openrouter',
  presetId: 'openrouter',
  label: 'OpenRouter',
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '',
  embeddingModel: '',
  status: 'invalid',
  error: '401 No auth credentials found',
  local: false,
  requiresKey: true,
};

const noop = () => {};

const meta = {
  title: 'Organisms/EndpointConfiguration',
  component: EndpointConfiguration,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { endpoints: [], presets, onAdd: noop, onChange: noop, onRemove: noop },
} satisfies Meta<typeof EndpointConfiguration>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing configured yet. */
export const Empty: Story = {};

/** A local Ollama server next to a hosted router with a missing key. */
export const LocalAndHosted: Story = {
  args: { endpoints: [ollama, openrouter] },
};

function Interactive() {
  const [endpoints, setEndpoints] = React.useState<EndpointInputValue[]>([ollama]);
  return (
    <EndpointConfiguration
      endpoints={endpoints}
      presets={presets}
      onAdd={(presetId) => {
        const preset = presets.find((p) => p.id === presetId)!;
        setEndpoints((list) => [
          ...list,
          { ...ollama, id: `${presetId}-${list.length + 1}`, presetId, label: preset.label, baseURL: '', status: 'idle', embeddingModel: '' },
        ]);
      }}
      onChange={(id, field, value) =>
        setEndpoints((list) => list.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
      }
      onRemove={(id) => setEndpoints((list) => list.filter((e) => e.id !== id))}
    />
  );
}

/** Add, edit and remove endpoints. */
export const AddAndRemove: Story = { render: () => <Interactive /> };
