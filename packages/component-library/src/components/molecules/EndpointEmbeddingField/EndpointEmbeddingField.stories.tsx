import type { Meta, StoryObj } from '@storybook/react';
import { EndpointEmbeddingField } from './EndpointEmbeddingField';

const meta = {
  title: 'Molecules/EndpointEmbeddingField',
  component: EndpointEmbeddingField,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { endpointId: 'ollama', presetId: 'ollama', value: 'nomic-embed-text', missing: false, onChange: () => {} },
} satisfies Meta<typeof EndpointEmbeddingField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The server has the model. */
export const Found: Story = {};

/** Ollama without the model: the pull command is shown. */
export const OllamaMissing: Story = { args: { missing: true } };

/** Ollama with no model set and none installed. */
export const OllamaNoneSet: Story = { args: { value: '', missing: true } };

/** Another server without the model: a note only. */
export const OtherServerMissing: Story = {
  args: { endpointId: 'lmstudio', presetId: 'lmstudio', value: 'text-embedding-nomic-embed-text-v1.5', missing: true },
};
