import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { EndpointInput, type EndpointInputValue } from './EndpointInput';

const ollama: EndpointInputValue = {
  embeddingModelFound: true,
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

const meta = {
  title: 'Molecules/EndpointInput',
  component: EndpointInput,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { endpoint: ollama, onChange: () => {}, onRemove: () => {} },
} satisfies Meta<typeof EndpointInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A local Ollama server that answered, with an embedding model set. */
export const LocalConnected: Story = {};

/** Checking the endpoint after an edit. */
export const Validating: Story = {
  args: { endpoint: { ...ollama, status: 'validating' } },
};

/** The server could not be reached (not running, or CORS not allowed). */
export const Unreachable: Story = {
  args: { endpoint: { ...ollama, id: 'lmstudio', presetId: 'lmstudio', label: 'LM Studio', baseURL: 'http://localhost:1234/v1', embeddingModel: '', status: 'invalid', error: 'Failed to fetch' } },
};

/** Connected, but the embedding model is not in the server's list (not pulled yet). */
export const EmbeddingModelMissing: Story = {
  args: { endpoint: { ...ollama, id: 'lmstudio', presetId: 'lmstudio', label: 'LM Studio', embeddingModelFound: false } },
};

/** Ollama without the embedding model: the exact pull command is shown. */
export const OllamaEmbeddingModelMissing: Story = {
  args: { endpoint: { ...ollama, embeddingModelFound: false } },
};

/** The hosted site was not allowed to reach this computer: the local run command is shown. */
export const LocalBlocked: Story = {
  args: {
    endpoint: { ...ollama, status: 'invalid', errorCode: 'localBlocked' },
    localRunCommand: 'npm run local',
    guideUrl: 'https://github.com/timini/ensemble/blob/main/docs/LOCAL_MODELS.md',
  },
};

/** A local preset pointed at a remote host: no Local badge, since it may be paid. */
export const LocalPresetRemoteHost: Story = {
  args: { endpoint: { ...ollama, id: 'vllm', presetId: 'vllm', label: 'vLLM', baseURL: 'https://gpu.example.com/v1', local: false } },
};

/** A hosted router that needs a key. */
export const HostedNeedsKey: Story = {
  args: {
    endpoint: {
      ...ollama,
      id: 'openrouter',
      presetId: 'openrouter',
      label: 'OpenRouter',
      baseURL: 'https://openrouter.ai/api/v1',
      embeddingModel: '',
      status: 'idle',
      local: false,
      requiresKey: true,
    },
  },
};

/** No base URL: the check fails before any request. */
export const BaseUrlMissing: Story = {
  args: { endpoint: { ...ollama, baseURL: '', status: 'invalid', errorCode: 'baseUrlRequired' } },
};

/** A custom URL, not checked yet. */
export const CustomEmpty: Story = {
  args: {
    endpoint: { ...ollama, id: 'custom', presetId: 'custom', label: 'Custom', baseURL: '', embeddingModel: '', status: 'idle', local: false },
  },
};

function Editable() {
  const [endpoint, setEndpoint] = React.useState<EndpointInputValue>({ ...ollama, status: 'idle' });
  return (
    <EndpointInput
      endpoint={endpoint}
      onChange={(field, value) => setEndpoint((e) => ({ ...e, [field]: value }))}
      onRemove={() => setEndpoint((e) => ({ ...e, baseURL: '' }))}
    />
  );
}

/** Fields update as you type. */
export const Interactive: Story = { render: () => <Editable /> };
