import type { Meta, StoryObj } from '@storybook/react';
import { SummarizerIndicator } from './SummarizerIndicator';

const meta = {
  title: 'Molecules/SummarizerIndicator',
  component: SummarizerIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    modelName: {
      control: 'text',
      description: 'Name of the summarizer model',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof SummarizerIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default
export const Default: Story = {
  args: {
    modelName: 'Claude 3 Opus',
  },
};

// Different Models
export const GPT4Turbo: Story = {
  args: {
    modelName: 'GPT-4 Turbo',
  },
};

export const GeminiPro: Story = {
  args: {
    modelName: 'Gemini Pro',
  },
};

export const Claude3Sonnet: Story = {
  args: {
    modelName: 'Claude 3 Sonnet',
  },
};

export const CustomModel: Story = {
  args: {
    modelName: 'Custom Fine-tuned Model v2.0',
  },
};

// With Custom Styling
export const WithCustomClassName: Story = {
  args: {
    modelName: 'Claude 3 Opus',
    className: 'shadow-lg',
  },
};

export const WithMargin: Story = {
  args: {
    modelName: 'GPT-4 Turbo',
    className: 'my-8',
  },
};

// In Context
export const InFormLayout: Story = {
  args: { modelName: '' },
  render: () => (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Ensemble Configuration
        </h3>
        <p className="text-sm text-gray-600">
          Configure your ensemble settings below
        </p>
      </div>
      <SummarizerIndicator modelName="Claude 3 Opus" />
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Additional Models
        </label>
        <p className="text-sm text-gray-600">
          Select additional models to include in your ensemble
        </p>
      </div>
    </div>
  ),
};

export const MultipleIndicators: Story = {
  args: { modelName: '' },
  render: () => (
    <div className="max-w-2xl space-y-4">
      <SummarizerIndicator modelName="Claude 3 Opus" />
      <SummarizerIndicator modelName="GPT-4 Turbo" />
      <SummarizerIndicator modelName="Gemini Pro" />
    </div>
  ),
};

// Responsive Example
export const ResponsiveWidth: Story = {
  args: { modelName: '' },
  render: () => (
    <div className="space-y-4">
      <div className="w-full">
        <p className="text-sm text-gray-600 mb-2">Full width:</p>
        <SummarizerIndicator modelName="Claude 3 Opus" />
      </div>
      <div className="max-w-md">
        <p className="text-sm text-gray-600 mb-2">Max width (md):</p>
        <SummarizerIndicator modelName="Claude 3 Opus" />
      </div>
      <div className="max-w-sm">
        <p className="text-sm text-gray-600 mb-2">Max width (sm):</p>
        <SummarizerIndicator modelName="Claude 3 Opus" />
      </div>
    </div>
  ),
};

// Edge Cases
export const LongModelName: Story = {
  args: {
    modelName: 'Super Advanced Custom Fine-tuned Model with Extended Name v3.14159',
  },
};

export const ShortModelName: Story = {
  args: {
    modelName: 'GPT',
  },
};

export const WithNumbers: Story = {
  args: {
    modelName: 'Model-123-XYZ-v4.5.6',
  },
};
