import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ModelPicker, type ModelPickerOption } from './ModelPicker';

const options: ModelPickerOption[] = [
  { id: 'openai/gpt-6.1', name: 'GPT-6.1 Sol', provider: 'openai', group: 'OpenAI', price: '$1.25' },
  { id: 'anthropic/claude-opus-5.5', name: 'Claude Opus 5.5', provider: 'anthropic', group: 'Anthropic', price: '$5.00' },
  { id: 'google/gemini-4-carbon', name: 'Gemini 4 Carbon', provider: 'google', group: 'Google', price: '$1.00' },
  { id: 'xai/grok-4.7', name: 'Grok 4.7', provider: 'xai', group: 'xAI', price: '$3.00' },
  { id: 'ollama/qwen3:14b', name: 'qwen3:14b', provider: 'openai-compatible', group: 'Ollama (local)', price: 'Free' },
  { id: 'ollama/llama3.3:8b', name: 'llama3.3:8b', provider: 'openai-compatible', group: 'Ollama (local)', price: 'Free' },
];

const meta = {
  title: 'Molecules/ModelPicker',
  component: ModelPicker,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { options, selectedIds: [], onToggle: () => undefined },
  render: function Render(args) {
    const [selected, setSelected] = React.useState(args.selectedIds);
    return (
      <div className="min-h-[440px]">
        <ModelPicker
          {...args}
          selectedIds={selected}
          onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
        />
      </div>
    );
  },
} satisfies Meta<typeof ModelPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing chosen yet. */
export const Empty: Story = {};

/** Three models chosen; the panel starts open. */
export const Open: Story = { args: { selectedIds: options.slice(0, 3).map((o) => o.id), defaultOpen: true } };

/** At the six model limit. */
export const AtLimit: Story = { args: { selectedIds: options.map((o) => o.id), defaultOpen: true } };

/** No keys and no local endpoint. */
export const NoModels: Story = { args: { options: [], defaultOpen: true } };
