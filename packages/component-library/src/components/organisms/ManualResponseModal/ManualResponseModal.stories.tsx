import type { Meta, StoryObj } from '@storybook/react';
import { ManualResponseModal, type ManualResponseData } from './ManualResponseModal';
import { useState } from 'react';
import { Button } from '../../atoms/Button';

const meta = {
  title: 'Organisms/ManualResponseModal',
  component: ManualResponseModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ManualResponseModal>;

export default meta;
type Story = StoryObj<typeof meta>;

interface ManualResponseModalWithStateProps {
  value?: string;
  modelName?: string;
  modelProvider?: string;
  placeholder?: string;
  onSubmit?: (data: ManualResponseData) => void;
  onCancel?: () => void;
}

// Wrapper component to handle state
const ManualResponseModalWithState = (args: ManualResponseModalWithStateProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(args.value || '');
  const [modelName, setModelName] = useState(args.modelName || '');
  const [modelProvider, setModelProvider] = useState(args.modelProvider || '');

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Manual Response</Button>
      <ManualResponseModal
        {...args}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={setValue}
        modelName={modelName}
        onModelNameChange={setModelName}
        modelProvider={modelProvider}
        onModelProviderChange={setModelProvider}
        onCancel={() => {
          setOpen(false);
          setValue('');
          setModelName('');
          setModelProvider('');
        }}
        onSubmit={(data) => {
          console.log('Submitted:', data);
          setOpen(false);
          setValue('');
          setModelName('');
          setModelProvider('');
        }}
      />
    </div>
  );
};

// Default story
export const Default: Story = {
  render: (args) => <ManualResponseModalWithState {...args} />,
  args: {},
};

// With initial values
export const WithInitialValue: Story = {
  render: (args) => <ManualResponseModalWithState {...args} />,
  args: {
    value: 'This is a pre-filled response that can be edited before submission.',
    modelName: 'GPT-4',
    modelProvider: 'OpenAI',
  },
};

// Custom title
export const CustomTitle: Story = {
  render: (args) => <ManualResponseModalWithState {...args} />,
  args: {
    title: 'Enter Custom Response',
  },
};

// Custom placeholder
export const CustomPlaceholder: Story = {
  render: (args) => <ManualResponseModalWithState {...args} />,
  args: {
    placeholder: 'Type your detailed response here...',
  },
};

// Long text example
export const WithLongText: Story = {
  render: (args) => <ManualResponseModalWithState {...args} />,
  args: {
    value:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
    modelName: 'Claude 3 Opus',
    modelProvider: 'Anthropic',
  },
};

// Open by default
export const OpenByDefault: Story = {
  args: {
    open: true,
    value: '',
    modelName: '',
    modelProvider: '',
    onChange: (value) => console.log('Changed:', value),
    onModelNameChange: (value) => console.log('Model Name Changed:', value),
    onModelProviderChange: (value) => console.log('Model Provider Changed:', value),
    onSubmit: (data) => console.log('Submitted:', data),
    onCancel: () => console.log('Cancelled'),
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    open: true,
    value: 'This response cannot be submitted',
    modelName: 'GPT-4',
    modelProvider: 'OpenAI',
    disabled: true,
    onChange: (value) => console.log('Changed:', value),
    onModelNameChange: (value) => console.log('Model Name Changed:', value),
    onModelProviderChange: (value) => console.log('Model Provider Changed:', value),
    onSubmit: (data) => console.log('Submitted:', data),
    onCancel: () => console.log('Cancelled'),
  },
};
