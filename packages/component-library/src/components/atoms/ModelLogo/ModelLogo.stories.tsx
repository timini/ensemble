import type { Meta, StoryObj } from '@storybook/react';
import { ModelLogo } from './ModelLogo';

const meta = {
  title: 'Atoms/ModelLogo',
  component: ModelLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    provider: {
      control: 'select',
      options: ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'perplexity'],
    },
    modelName: {
      control: 'text',
    },
    modelId: {
      control: 'text',
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'xl'],
    },
  },
} satisfies Meta<typeof ModelLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenAI: Story = {
  args: { provider: 'openai', modelName: 'GPT-4o', size: 'lg' },
};

export const Claude: Story = {
  args: { provider: 'anthropic', modelName: 'Claude Sonnet 4.6', size: 'lg' },
};

export const Gemini: Story = {
  args: { provider: 'google', modelName: 'Gemini 2.5 Pro', size: 'lg' },
};

export const Grok: Story = {
  args: { provider: 'xai', modelName: 'Grok 4', size: 'lg' },
};

export const ProviderFallback: Story = {
  args: { provider: 'anthropic', modelName: 'Experimental Sonnet', size: 'lg' },
};

export const AllModelFamilies: Story = {
  args: {
    provider: 'openai',
    modelName: 'GPT-4o',
    size: 'xl',
  },
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <ModelLogo provider="openai" modelName="GPT-4o" size="xl" />
        <span className="text-xs text-muted-foreground">GPT</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ModelLogo provider="anthropic" modelName="Claude Sonnet 4.6" size="xl" />
        <span className="text-xs text-muted-foreground">Claude</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ModelLogo provider="google" modelName="Gemini 2.5 Pro" size="xl" />
        <span className="text-xs text-muted-foreground">Gemini</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ModelLogo provider="xai" modelName="Grok 4" size="xl" />
        <span className="text-xs text-muted-foreground">Grok</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ModelLogo provider="deepseek" modelName="DeepSeek Reasoner" size="xl" />
        <span className="text-xs text-muted-foreground">DeepSeek</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ModelLogo provider="perplexity" modelName="Sonar Pro" size="xl" />
        <span className="text-xs text-muted-foreground">Perplexity</span>
      </div>
    </div>
  ),
};
