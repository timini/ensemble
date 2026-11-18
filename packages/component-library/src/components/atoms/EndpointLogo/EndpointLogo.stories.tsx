import type { Meta, StoryObj } from '@storybook/react';
import { EndpointLogo, ENDPOINT_LOGO_PRESETS } from './EndpointLogo';

const meta = {
  title: 'Atoms/EndpointLogo',
  component: EndpointLogo,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    preset: { control: 'select', options: [...ENDPOINT_LOGO_PRESETS] },
    size: { control: 'select', options: ['sm', 'default', 'lg', 'xl'] },
  },
} satisfies Meta<typeof EndpointLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ollama: Story = { args: { preset: 'ollama', size: 'lg' } };
export const LMStudio: Story = { args: { preset: 'lmstudio', size: 'lg' } };
export const LlamaCpp: Story = { args: { preset: 'llamacpp', size: 'lg' } };
export const VLLM: Story = { args: { preset: 'vllm', size: 'lg' } };
export const OpenRouter: Story = { args: { preset: 'openrouter', size: 'lg' } };
export const Groq: Story = { args: { preset: 'groq', size: 'lg' } };
export const Together: Story = { args: { preset: 'together', size: 'lg' } };
export const Custom: Story = { args: { preset: 'custom', size: 'lg' } };

/** Every preset side by side. */
export const AllPresets: Story = {
  args: { preset: 'ollama' },
  render: () => (
    <div className="flex items-center gap-6">
      {ENDPOINT_LOGO_PRESETS.map((preset) => (
        <div key={preset} className="flex flex-col items-center gap-2">
          <EndpointLogo preset={preset} size="xl" />
          <span className="text-xs text-muted-foreground">{preset}</span>
        </div>
      ))}
    </div>
  ),
};
