import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './Progress';

const meta = {
  title: 'Atoms/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 50,
  },
  render: (args) => (
    <div className="w-64">
      <Progress {...args} />
    </div>
  ),
};

export const Zero: Story = {
  args: {
    value: 0,
  },
  render: (args) => (
    <div className="w-64">
      <Progress {...args} />
    </div>
  ),
};

export const Complete: Story = {
  args: {
    value: 100,
  },
  render: (args) => (
    <div className="w-64">
      <Progress {...args} />
    </div>
  ),
};

export const Destructive: Story = {
  args: {
    value: 75,
    variant: 'destructive',
  },
  render: (args) => (
    <div className="w-64">
      <Progress {...args} />
    </div>
  ),
};

export const Success: Story = {
  args: {
    value: 85,
    variant: 'success',
  },
  render: (args) => (
    <div className="w-64">
      <Progress {...args} />
    </div>
  ),
};

export const Warning: Story = {
  args: {
    value: 45,
    variant: 'warning',
  },
  render: (args) => (
    <div className="w-64">
      <Progress {...args} />
    </div>
  ),
};

export const CustomHeight: Story = {
  args: {
    value: 60,
    className: 'h-4',
  },
  render: (args) => (
    <div className="w-64">
      <Progress {...args} />
    </div>
  ),
};

export const MultipleProgress: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <div>
        <div className="flex justify-between mb-2 text-sm">
          <span>Low Agreement (25%)</span>
          <span className="text-destructive">Poor</span>
        </div>
        <Progress value={25} variant="destructive" />
      </div>
      <div>
        <div className="flex justify-between mb-2 text-sm">
          <span>Medium Agreement (56%)</span>
          <span className="text-warning">Fair</span>
        </div>
        <Progress value={56} variant="warning" />
      </div>
      <div>
        <div className="flex justify-between mb-2 text-sm">
          <span>High Agreement (92%)</span>
          <span className="text-success">Excellent</span>
        </div>
        <Progress value={92} variant="success" />
      </div>
    </div>
  ),
};

export const AgreementAnalysis: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <h3 className="font-semibold">Model Agreement Analysis</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <span className="text-sm">Claude 3 Haiku</span>
            <span className="text-muted-foreground">vs</span>
            <span className="text-sm">Claude 3 Opus</span>
          </div>
          <div className="flex items-center space-x-3">
            <Progress value={56} variant="warning" className="w-32" />
            <span className="text-sm font-medium w-12">56%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <span className="text-sm">GPT-4</span>
            <span className="text-muted-foreground">vs</span>
            <span className="text-sm">Gemini Pro</span>
          </div>
          <div className="flex items-center space-x-3">
            <Progress value={84} variant="success" className="w-32" />
            <span className="text-sm font-medium w-12">84%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <span className="text-sm">GPT-4</span>
            <span className="text-muted-foreground">vs</span>
            <span className="text-sm">Claude 3 Opus</span>
          </div>
          <div className="flex items-center space-x-3">
            <Progress value={32} variant="destructive" className="w-32" />
            <span className="text-sm font-medium w-12">32%</span>
          </div>
        </div>
      </div>
    </div>
  ),
};
