import type { Meta, StoryObj } from '@storybook/react';
import { ApiKeyConfiguration } from './ApiKeyConfiguration';

const meta = {
  title: 'Organisms/ApiKeyConfiguration',
  component: ApiKeyConfiguration,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    heading: {
      control: 'text',
      description: 'Heading text for the configuration section',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the entire section is disabled',
    },
  },
} satisfies Meta<typeof ApiKeyConfiguration>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story - all providers with valid keys
export const Default: Story = {
  args: {
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: 'sk-proj-...',
        placeholder: 'Enter your OpenAI API key',
        validationStatus: 'valid',
        showKey: false,
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        value: 'sk-ant-...',
        placeholder: 'Enter your Anthropic API key',
        validationStatus: 'valid',
        showKey: false,
      },
      {
        provider: 'google',
        label: 'Google (Gemini)',
        value: 'AIza...',
        placeholder: 'Enter your Google API key',
        validationStatus: 'valid',
        showKey: false,
      },
      {
        provider: 'xai',
        label: 'Grok',
        value: 'xai-...',
        placeholder: 'Enter your Grok API key',
        validationStatus: 'valid',
        showKey: false,
      },
    ],
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
};

// Empty state - no keys configured
export const Empty: Story = {
  args: {
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: '',
        placeholder: 'Enter your OpenAI API key',
        helperText: 'Get your API key from platform.openai.com',
        validationStatus: 'idle',
        showKey: false,
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        value: '',
        placeholder: 'Enter your Anthropic API key',
        helperText: 'Get your API key from console.anthropic.com',
        validationStatus: 'idle',
        showKey: false,
      },
      {
        provider: 'google',
        label: 'Google (Gemini)',
        value: '',
        placeholder: 'Enter your Google API key',
        helperText: 'Get your API key from makersuite.google.com',
        validationStatus: 'idle',
        showKey: false,
      },
      {
        provider: 'xai',
        label: 'Grok',
        value: '',
        placeholder: 'Enter your Grok API key',
        helperText: 'Get your API key from console.x.ai',
        validationStatus: 'idle',
        showKey: false,
      },
    ],
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
};

// Validating state
export const Validating: Story = {
  args: {
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: 'sk-proj-...',
        placeholder: 'Enter your OpenAI API key',
        validationStatus: 'validating',
        showKey: false,
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        value: 'sk-ant-...',
        placeholder: 'Enter your Anthropic API key',
        validationStatus: 'valid',
        showKey: false,
      },
    ],
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
};

// Mixed validation states
export const MixedStates: Story = {
  args: {
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: 'sk-proj-...',
        placeholder: 'Enter your OpenAI API key',
        validationStatus: 'valid',
        showKey: false,
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        value: 'invalid-key',
        placeholder: 'Enter your Anthropic API key',
        validationStatus: 'invalid',
        error: 'Invalid API key format',
        showKey: false,
      },
      {
        provider: 'google',
        label: 'Google (Gemini)',
        value: 'AIza...',
        placeholder: 'Enter your Google API key',
        validationStatus: 'validating',
        showKey: false,
      },
      {
        provider: 'xai',
        label: 'Grok',
        value: '',
        placeholder: 'Enter your Grok API key',
        validationStatus: 'idle',
        showKey: false,
      },
    ],
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
};

// With errors
export const WithErrors: Story = {
  args: {
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: 'invalid-key',
        placeholder: 'Enter your OpenAI API key',
        validationStatus: 'invalid',
        error: 'Invalid API key format. Must start with "sk-"',
        showKey: true,
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        value: 'sk-ant-invalid',
        placeholder: 'Enter your Anthropic API key',
        validationStatus: 'invalid',
        error: 'API key authentication failed. Please check your key.',
        showKey: true,
      },
    ],
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
};

// Keys visible
export const KeysVisible: Story = {
  args: {
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: 'sk-proj-1234567890abcdef',
        placeholder: 'Enter your OpenAI API key',
        validationStatus: 'valid',
        showKey: true,
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        value: 'sk-ant-1234567890abcdef',
        placeholder: 'Enter your Anthropic API key',
        validationStatus: 'valid',
        showKey: true,
      },
    ],
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: 'sk-proj-...',
        placeholder: 'Enter your OpenAI API key',
        validationStatus: 'valid',
        showKey: false,
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        value: 'sk-ant-...',
        placeholder: 'Enter your Anthropic API key',
        validationStatus: 'valid',
        showKey: false,
      },
    ],
    disabled: true,
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
};

// Dark mode
export const DarkMode: Story = {
  args: {
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: 'sk-proj-...',
        placeholder: 'Enter your OpenAI API key',
        validationStatus: 'valid',
        showKey: false,
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        value: '',
        placeholder: 'Enter your Anthropic API key',
        validationStatus: 'idle',
        showKey: false,
      },
    ],
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

// Partially disabled
export const PartiallyDisabled: Story = {
  args: {
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: 'sk-proj-...',
        placeholder: 'Enter your OpenAI API key',
        validationStatus: 'valid',
        showKey: false,
        disabled: true,
      },
      {
        provider: 'anthropic',
        label: 'Anthropic',
        value: '',
        placeholder: 'Enter your Anthropic API key',
        validationStatus: 'idle',
        showKey: false,
        disabled: false,
      },
    ],
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
};

// Custom heading
export const CustomHeading: Story = {
  args: {
    heading: 'Manage Your API Keys',
    items: [
      {
        provider: 'openai',
        label: 'OpenAI',
        value: 'sk-proj-...',
        placeholder: 'Enter your OpenAI API key',
        validationStatus: 'valid',
        showKey: false,
      },
    ],
    onKeyChange: (provider, value) => console.log('Key changed:', provider, value),
    onToggleShow: (provider) => console.log('Toggle show:', provider),
  },
};
