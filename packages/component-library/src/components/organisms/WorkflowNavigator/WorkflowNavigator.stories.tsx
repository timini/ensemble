import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowNavigator } from './WorkflowNavigator';
import * as React from 'react';

const meta = {
  title: 'Organisms/WorkflowNavigator',
  component: WorkflowNavigator,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    currentStep: {
      control: 'select',
      options: ['config', 'ensemble', 'prompt', 'review'],
      description: 'Current workflow step',
    },
    onBack: {
      description: 'Callback when back button is clicked',
    },
    onContinue: {
      description: 'Callback when continue button is clicked',
    },
  },
} satisfies Meta<typeof WorkflowNavigator>;

export default meta;
type Story = StoryObj<typeof meta>;

// Step 1: Config - Only Continue button
export const ConfigStep: Story = {
  args: {
    currentStep: 'config',
    continueLabel: 'Choose Your AI Models',
    onContinue: () => console.log('Continue to ensemble'),
  },
};

// Step 2: Ensemble - Back + Continue
export const EnsembleStep: Story = {
  args: {
    currentStep: 'ensemble',
    backLabel: 'Back to Configuration',
    continueLabel: 'Continue to Prompt',
    onBack: () => console.log('Back to config'),
    onContinue: () => console.log('Continue to prompt'),
  },
};

// Step 3: Prompt - Back + Continue
export const PromptStep: Story = {
  args: {
    currentStep: 'prompt',
    backLabel: 'Back to Models',
    continueLabel: 'Generate Responses',
    onBack: () => console.log('Back to ensemble'),
    onContinue: () => console.log('Generate responses'),
  },
};

// Step 4: Review - Back + other actions
export const ReviewStep: Story = {
  args: {
    currentStep: 'review',
    backLabel: 'Back to Prompt',
    continueLabel: 'New Comparison',
    onBack: () => console.log('Back to prompt'),
    onContinue: () => console.log('New comparison'),
  },
};

// With disabled continue button
export const ContinueDisabled: Story = {
  args: {
    currentStep: 'ensemble',
    backLabel: 'Back to Configuration',
    continueLabel: 'Continue to Prompt',
    continueDisabled: true,
    onBack: () => console.log('Back'),
    onContinue: () => console.log('Continue'),
  },
};

// Interactive example
export const Interactive: Story = {
  args: {
    currentStep: 'ensemble',
  },
  render: function Render(args) {
    const [step, setStep] = React.useState(args.currentStep);

    const handleBack = () => {
      const steps = ['config', 'ensemble', 'prompt', 'review'];
      const currentIndex = steps.indexOf(step);
      if (currentIndex > 0) {
        setStep(steps[currentIndex - 1] as typeof step);
      }
    };

    const handleContinue = () => {
      const steps = ['config', 'ensemble', 'prompt', 'review'];
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setStep(steps[currentIndex + 1] as typeof step);
      }
    };

    const getLabels = () => {
      const labels = {
        config: { continue: 'Choose Your AI Models' },
        ensemble: { back: 'Back to Configuration', continue: 'Continue to Prompt' },
        prompt: { back: 'Back to Models', continue: 'Generate Responses' },
        review: { back: 'Back to Prompt', continue: 'New Comparison' },
      };
      return labels[step];
    };

    const labels = getLabels();

    return (
      <div className="space-y-8">
        <div className="text-center">
          <p className="text-sm text-gray-500">Current Step: <strong>{step}</strong></p>
          <p className="text-xs text-gray-400 mt-1">Click the navigation buttons to move between steps</p>
        </div>
        <WorkflowNavigator
          currentStep={step}
          backLabel={labels.back}
          continueLabel={labels.continue}
          onBack={step !== 'config' ? handleBack : undefined}
          onContinue={handleContinue}
        />
      </div>
    );
  },
};

// All steps showcase
export const AllSteps: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold mb-2">Step 1: Config</h3>
        <WorkflowNavigator
          currentStep="config"
          continueLabel="Choose Your AI Models"
          onContinue={() => {}}
        />
      </div>
      <div>
        <h3 className="font-semibold mb-2">Step 2: Ensemble</h3>
        <WorkflowNavigator
          currentStep="ensemble"
          backLabel="Back to Configuration"
          continueLabel="Continue to Prompt"
          onBack={() => {}}
          onContinue={() => {}}
        />
      </div>
      <div>
        <h3 className="font-semibold mb-2">Step 3: Prompt</h3>
        <WorkflowNavigator
          currentStep="prompt"
          backLabel="Back to Models"
          continueLabel="Generate Responses"
          onBack={() => {}}
          onContinue={() => {}}
        />
      </div>
      <div>
        <h3 className="font-semibold mb-2">Step 4: Review</h3>
        <WorkflowNavigator
          currentStep="review"
          backLabel="Back to Prompt"
          continueLabel="New Comparison"
          onBack={() => {}}
          onContinue={() => {}}
        />
      </div>
    </div>
  ),
};
