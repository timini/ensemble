import type { Meta, StoryObj } from '@storybook/react';
import { ProgressSteps } from './ProgressSteps';

const meta = {
  title: 'Components/ProgressSteps',
  component: ProgressSteps,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    currentStep: {
      control: 'select',
      options: ['config', 'ensemble', 'prompt', 'review'],
      description: 'The current active step in the workflow',
    },
  },
} satisfies Meta<typeof ProgressSteps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Config: Story = {
  args: {
    currentStep: 'config',
  },
};

export const Ensemble: Story = {
  args: {
    currentStep: 'ensemble',
  },
};

export const Prompt: Story = {
  args: {
    currentStep: 'prompt',
  },
};

export const Review: Story = {
  args: {
    currentStep: 'review',
  },
};

export const AllSteps: Story = {
  args: {
    currentStep: 'config',
  },
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-center mb-4 font-semibold">Step 1: Config</h3>
        <ProgressSteps currentStep="config" />
      </div>
      <div>
        <h3 className="text-center mb-4 font-semibold">Step 2: Ensemble</h3>
        <ProgressSteps currentStep="ensemble" />
      </div>
      <div>
        <h3 className="text-center mb-4 font-semibold">Step 3: Prompt</h3>
        <ProgressSteps currentStep="prompt" />
      </div>
      <div>
        <h3 className="text-center mb-4 font-semibold">Step 4: Review</h3>
        <ProgressSteps currentStep="review" />
      </div>
    </div>
  ),
};
