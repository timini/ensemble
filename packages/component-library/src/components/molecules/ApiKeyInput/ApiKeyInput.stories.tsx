import type { Meta, StoryObj } from '@storybook/react';
import { ApiKeyInput } from './ApiKeyInput';

const meta = {
  title: 'Molecules/ApiKeyInput',
  component: ApiKeyInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    provider: {
      control: 'select',
      options: ['openai', 'anthropic', 'google', 'xai', 'perplexity'],
      description: 'AI provider for the API key',
    },
    validationStatus: {
      control: 'select',
      options: ['idle', 'validating', 'valid', 'invalid'],
      description: 'Validation state of the API key',
    },
    showKey: {
      control: 'boolean',
      description: 'Whether the API key is visible or masked',
    },
  },
} satisfies Meta<typeof ApiKeyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic states
export const Idle: Story = {
  args: {
    provider: 'openai',
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    validationStatus: 'idle',
  },
};

export const Validating: Story = {
  args: {
    provider: 'openai',
    label: 'OpenAI API Key',
    value: 'sk-1234567890',
    validationStatus: 'validating',
  },
};

export const Valid: Story = {
  args: {
    provider: 'openai',
    label: 'OpenAI API Key',
    value: 'sk-proj-1234567890abcdef',
    validationStatus: 'valid',
  },
};

export const Invalid: Story = {
  args: {
    provider: 'openai',
    label: 'OpenAI API Key',
    value: 'invalid-key',
    validationStatus: 'invalid',
    error: 'Invalid API key format',
  },
};

// Different providers
export const AnthropicKey: Story = {
  args: {
    provider: 'anthropic',
    label: 'Anthropic API Key',
    placeholder: 'sk-ant-...',
    validationStatus: 'idle',
  },
};

export const GoogleKey: Story = {
  args: {
    provider: 'google',
    label: 'Google AI API Key',
    placeholder: 'AIza...',
    validationStatus: 'idle',
  },
};

export const XAIKey: Story = {
  args: {
    provider: 'xai',
    label: 'XAI API Key',
    placeholder: 'xai-...',
    validationStatus: 'idle',
  },
};

// Show/hide key
export const KeyHidden: Story = {
  args: {
    provider: 'openai',
    label: 'OpenAI API Key',
    value: 'sk-proj-1234567890abcdef',
    showKey: false,
    validationStatus: 'valid',
  },
};

export const KeyVisible: Story = {
  args: {
    provider: 'openai',
    label: 'OpenAI API Key',
    value: 'sk-proj-1234567890abcdef',
    showKey: true,
    validationStatus: 'valid',
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    provider: 'openai',
    label: 'OpenAI API Key',
    value: 'sk-proj-1234567890abcdef',
    disabled: true,
    validationStatus: 'valid',
  },
};

// Interactive example
export const Interactive: Story = {
  args: {
    provider: 'openai',
    label: 'OpenAI API Key',
    placeholder: 'Enter your API key',
    helperText: 'Find your API key at https://platform.openai.com/api-keys',
    validationStatus: 'idle',
    onChange: (value: string) => console.log('API key changed:', value),
    onToggleShow: () => console.log('Toggle show/hide'),
  },
};

// Dark mode
export const DarkMode: Story = {
  args: {
    provider: 'openai',
    label: 'OpenAI API Key',
    value: 'sk-proj-1234567890abcdef',
    validationStatus: 'valid',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8 w-[400px]">
        <Story />
      </div>
    ),
  ],
};

// All providers showcase
export const AllProviders: Story = {
  args: { provider: 'openai', label: 'Provider', validationStatus: 'idle' },
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <ApiKeyInput
        provider="openai"
        label="OpenAI API Key"
        placeholder="sk-proj-..."
        validationStatus="valid"
        value="sk-proj-1234567890"
      />
      <ApiKeyInput
        provider="anthropic"
        label="Anthropic API Key"
        placeholder="sk-ant-..."
        validationStatus="validating"
        value="sk-ant-1234567890"
      />
      <ApiKeyInput
        provider="google"
        label="Google AI API Key"
        placeholder="AIza..."
        validationStatus="invalid"
        value="invalid-key"
        error="Invalid API key format"
      />
      <ApiKeyInput
        provider="xai"
        label="XAI API Key"
        placeholder="xai-..."
        validationStatus="idle"
      />
    </div>
  ),
};
