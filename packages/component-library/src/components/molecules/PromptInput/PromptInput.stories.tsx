import type { Meta, StoryObj } from '@storybook/react';
import { PromptInput } from './PromptInput';

const meta = {
  title: 'Molecules/PromptInput',
  component: PromptInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    maxLength: {
      control: 'number',
      description: 'Maximum character length',
    },
    minLength: {
      control: 'number',
      description: 'Minimum character length for validation',
    },
  },
} satisfies Meta<typeof PromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic states with different character counts
export const Empty: Story = {
  args: {
    label: 'Enter your prompt',
    placeholder: 'Type your question here...',
    value: '',
    minLength: 10,
  },
};

export const ShortText: Story = {
  args: {
    label: 'Enter your prompt',
    value: 'Short text with 50 characters in this example here',
    minLength: 10,
  },
};

export const MediumText: Story = {
  args: {
    label: 'Enter your prompt',
    value:
      'This is a medium length text example that demonstrates the character counter in action. ' +
      'It contains around 500 characters to show how the component handles longer inputs. ' +
      'The character counter should update in real-time as users type their prompts. ' +
      'This helps users understand how much they have typed and stay within any character limits. ' +
      'The component also provides visual feedback about the current character count and validation status. ' +
      'When users type below the minimum length, the component should indicate that the input is too short.',
    minLength: 10,
  },
};

export const LongText: Story = {
  args: {
    label: 'Enter your prompt',
    value:
      'This is a very long text example that contains approximately 5000 characters. '.repeat(
        60
      ),
    minLength: 10,
    maxLength: 10000,
  },
};

// Validation states
export const Invalid: Story = {
  args: {
    label: 'Enter your prompt',
    value: 'Too short',
    minLength: 10,
    error: 'Prompt must be at least 10 characters',
  },
};

export const Valid: Story = {
  args: {
    label: 'Enter your prompt',
    value: 'This is a valid prompt with more than 10 characters',
    minLength: 10,
  },
};

// With character limit
export const WithMaxLength: Story = {
  args: {
    label: 'Enter your prompt',
    placeholder: 'Maximum 100 characters',
    value: 'This text has a maximum character limit',
    minLength: 10,
    maxLength: 100,
  },
};

export const NearMaxLength: Story = {
  args: {
    label: 'Enter your prompt',
    value: 'This is getting close to the max length of 100 characters and should show warning colors soon!',
    minLength: 10,
    maxLength: 100,
  },
};

export const AtMaxLength: Story = {
  args: {
    label: 'Enter your prompt',
    value: 'This text is exactly at the maximum length of 100 characters. No more typing is allowed here now',
    minLength: 10,
    maxLength: 100,
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    label: 'Enter your prompt',
    value: 'This input is disabled',
    disabled: true,
    minLength: 10,
  },
};

// Interactive example
export const Interactive: Story = {
  args: {
    label: 'Enter your prompt',
    placeholder: 'Ask a question to the AI ensemble...',
    helperText: 'Minimum 10 characters required',
    minLength: 10,
    maxLength: 5000,
    onChange: (value: string) => console.log('Prompt changed:', value),
  },
};

// All validation states
export const AllStates: Story = {
  args: {
    label: 'Enter prompt',
    value: '',
  },
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      <PromptInput
        label="Empty (Invalid)"
        value=""
        minLength={10}
        error="Prompt is required"
      />
      <PromptInput
        label="Too Short (Invalid)"
        value="Short"
        minLength={10}
        error="Prompt must be at least 10 characters"
      />
      <PromptInput
        label="Valid Length"
        value="This prompt has enough characters to be valid"
        minLength={10}
      />
      <PromptInput
        label="Near Max Length"
        value="This text is approaching the maximum character limit and counter turns orange"
        minLength={10}
        maxLength={100}
      />
    </div>
  ),
};
