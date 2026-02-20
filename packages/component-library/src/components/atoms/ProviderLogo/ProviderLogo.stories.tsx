import type { Meta, StoryObj } from '@storybook/react';
import { ProviderLogo } from './ProviderLogo';

const meta = {
  title: 'Atoms/ProviderLogo',
  component: ProviderLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    provider: {
      control: 'select',
      options: ['openai', 'anthropic', 'google', 'xai', 'deepseek'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'xl'],
    },
  },
} satisfies Meta<typeof ProviderLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenAI: Story = {
  args: { provider: 'openai', size: 'lg' },
};

export const Anthropic: Story = {
  args: { provider: 'anthropic', size: 'lg' },
};

export const Google: Story = {
  args: { provider: 'google', size: 'lg' },
};

export const XAI: Story = {
  args: { provider: 'xai', size: 'lg' },
};

export const DeepSeek: Story = {
  args: { provider: 'deepseek', size: 'lg' },
};

export const AllProviders: Story = {
  args: { provider: 'openai' },
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <ProviderLogo provider="openai" size="xl" />
        <span className="text-xs text-muted-foreground">OpenAI</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderLogo provider="anthropic" size="xl" />
        <span className="text-xs text-muted-foreground">Anthropic</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderLogo provider="google" size="xl" />
        <span className="text-xs text-muted-foreground">Google</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderLogo provider="xai" size="xl" />
        <span className="text-xs text-muted-foreground">XAI</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderLogo provider="deepseek" size="xl" />
        <span className="text-xs text-muted-foreground">DeepSeek</span>
      </div>
    </div>
  ),
};

export const AllSizes: Story = {
  args: { provider: 'openai' },
  render: () => (
    <div className="flex items-end gap-4">
      <div className="flex flex-col items-center gap-2">
        <ProviderLogo provider="openai" size="sm" />
        <span className="text-xs text-muted-foreground">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderLogo provider="openai" size="default" />
        <span className="text-xs text-muted-foreground">default</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderLogo provider="openai" size="lg" />
        <span className="text-xs text-muted-foreground">lg</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ProviderLogo provider="openai" size="xl" />
        <span className="text-xs text-muted-foreground">xl</span>
      </div>
    </div>
  ),
};
