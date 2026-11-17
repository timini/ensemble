import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import {
  EmbeddingsProviderSelector,
  type EmbeddingsProviderSelectorProps,
  type EmbeddingsProviderValue,
} from './EmbeddingsProviderSelector';

const meta = {
  title: 'Molecules/EmbeddingsProviderSelector',
  component: EmbeddingsProviderSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'radio',
      options: ['auto', 'openai', 'google', 'openai-compatible'],
      description: 'Stored preference',
    },
    activeProvider: {
      control: 'radio',
      options: ['openai', 'google', 'openai-compatible', null],
      description: 'Provider that will compute embeddings',
    },
  },
} satisfies Meta<typeof EmbeddingsProviderSelector>;

export default meta;

function InteractiveSelector(args: EmbeddingsProviderSelectorProps) {
  const [value, setValue] = React.useState<EmbeddingsProviderValue>(args.value);
  const active = value === 'auto' ? 'openai' : value;
  return (
    <EmbeddingsProviderSelector
      {...args}
      value={value}
      activeProvider={active}
      onChange={setValue}
    />
  );
}
type Story = StoryObj<typeof meta>;

/** Auto with both keys valid: OpenAI is used. */
export const AutoBothAvailable: Story = {
  args: {
    value: 'auto',
    available: { openai: true, google: true, 'openai-compatible': false },
    activeProvider: 'openai',
    onChange: () => {},
  },
};

/** Auto with only a Google key: Google is used. */
export const AutoGoogleOnly: Story = {
  args: {
    value: 'auto',
    available: { openai: false, google: true, 'openai-compatible': false },
    activeProvider: 'google',
    onChange: () => {},
  },
};

/** The user chose Google over OpenAI. */
export const GoogleOverride: Story = {
  args: {
    value: 'google',
    available: { openai: true, google: true, 'openai-compatible': false },
    activeProvider: 'google',
    onChange: () => {},
  },
};

/** Local models only: an Ollama endpoint with nomic-embed-text scores agreement. */
export const LocalEndpointOnly: Story = {
  args: {
    value: 'auto',
    available: { openai: false, google: false, 'openai-compatible': true },
    activeProvider: 'openai-compatible',
    onChange: () => {},
  },
};

/** No OpenAI or Google key: no agreement score can be computed. */
export const NoneAvailable: Story = {
  args: {
    value: 'auto',
    available: { openai: false, google: false, 'openai-compatible': false },
    activeProvider: null,
    onChange: () => {},
  },
};

/** Interactive version that keeps its own state. */
export const Interactive: Story = {
  args: {
    value: 'auto',
    available: { openai: true, google: true, 'openai-compatible': false },
    activeProvider: 'openai',
    onChange: () => {},
  },
  render: (args) => <InteractiveSelector {...args} />,
};
