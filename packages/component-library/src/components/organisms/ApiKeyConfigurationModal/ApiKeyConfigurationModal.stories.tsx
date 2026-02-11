import type { Meta, StoryObj } from '@storybook/react';
import { ApiKeyConfigurationModal } from './ApiKeyConfigurationModal';
import * as React from 'react';

const meta = {
  title: 'Organisms/ApiKeyConfigurationModal',
  component: ApiKeyConfigurationModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      description: 'Whether the modal is open',
    },
    onOpenChange: {
      description: 'Callback when modal should close',
    },
    provider: {
      description: 'The provider to configure',
    },
    items: {
      description: 'Array of API key configurations',
    },
    onKeyChange: {
      description: 'Callback when an API key value changes',
    },
    onToggleShow: {
      description: 'Callback when show/hide toggle is clicked',
    },
  },
} satisfies Meta<typeof ApiKeyConfigurationModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockItems = [
  {
    provider: 'openai' as const,
    label: 'OpenAI API Key',
    value: '',
    placeholder: 'sk-...',
    helperText: 'Enter your OpenAI API key',
    validationStatus: 'idle' as const,
    showKey: false,
  },
];

export const Default: Story = {
  args: {
    open: true,
    provider: 'openai',
    items: mockItems,
    onOpenChange: (open: boolean) => console.log('Open changed:', open),
    onKeyChange: (provider: string, value: string) =>
      console.log('Key changed:', provider, value),
    onToggleShow: (provider: string) => console.log('Toggle show:', provider),
  },
};

export const WithValue: Story = {
  args: {
    open: true,
    provider: 'openai',
    items: [
      {
        provider: 'openai' as const,
        label: 'OpenAI API Key',
        value: 'sk-proj-1234567890',
        placeholder: 'sk-...',
        helperText: 'API key configured',
        validationStatus: 'valid' as const,
        showKey: false,
      },
    ],
    onOpenChange: (open: boolean) => console.log('Open changed:', open),
    onKeyChange: (provider: string, value: string) =>
      console.log('Key changed:', provider, value),
    onToggleShow: (provider: string) => console.log('Toggle show:', provider),
  },
};

export const Anthropic: Story = {
  args: {
    open: true,
    provider: 'anthropic',
    items: [
      {
        provider: 'anthropic' as const,
        label: 'Anthropic API Key',
        value: '',
        placeholder: 'sk-ant-...',
        helperText: 'Enter your Anthropic API key',
        validationStatus: 'idle' as const,
        showKey: false,
      },
    ],
    onOpenChange: (open: boolean) => console.log('Open changed:', open),
    onKeyChange: (provider: string, value: string) =>
      console.log('Key changed:', provider, value),
    onToggleShow: (provider: string) => console.log('Toggle show:', provider),
  },
};

export const DarkMode: Story = {
  args: {
    open: true,
    provider: 'openai',
    items: mockItems,
    onOpenChange: (open: boolean) => console.log('Open changed:', open),
    onKeyChange: (provider: string, value: string) =>
      console.log('Key changed:', provider, value),
    onToggleShow: (provider: string) => console.log('Toggle show:', provider),
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

export const Interactive: Story = {
  args: {
    open: true,
    provider: 'openai',
    items: mockItems,
    onOpenChange: () => {},
    onKeyChange: () => {},
    onToggleShow: () => {},
  },
  render: function Render(args) {
    const [open, setOpen] = React.useState(args.open);
    const [items, setItems] = React.useState(args.items);

    const handleKeyChange = (provider: string, value: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.provider === provider ? { ...item, value } : item
        )
      );
    };

    const handleToggleShow = (provider: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.provider === provider ? { ...item, showKey: !item.showKey } : item
        )
      );
    };

    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Open Modal
        </button>

        <ApiKeyConfigurationModal
          open={open}
          onOpenChange={setOpen}
          provider={args.provider}
          items={items}
          onKeyChange={handleKeyChange}
          onToggleShow={handleToggleShow}
        />
      </div>
    );
  },
};
