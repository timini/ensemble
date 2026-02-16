import type { Meta, StoryObj } from '@storybook/react';
import { ProgressSteps } from './ProgressSteps';
import * as React from 'react';

const meta = {
  title: 'Molecules/ProgressSteps',
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
    onStepClick: {
      action: 'step-clicked',
      description: 'Optional callback for completed step navigation',
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

export const ClickableCompletedSteps: Story = {
  args: {
    currentStep: 'review',
  },
  render: function Render(args) {
    const [currentStep, setCurrentStep] = React.useState(args.currentStep);

    return (
      <ProgressSteps
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />
    );
  },
};

/** Hover over any step circle to see its descriptive tooltip. */
export const WithTooltips: Story = {
  args: {
    currentStep: 'ensemble',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Each step displays a tooltip on hover describing what the step involves. Hover over the step circles to see the tooltips.',
      },
    },
  },
};
