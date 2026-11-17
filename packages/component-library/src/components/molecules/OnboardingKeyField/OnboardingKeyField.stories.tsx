import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OnboardingKeyField, type OnboardingKeyProvider } from './OnboardingKeyField';

const meta = {
  title: 'Molecules/OnboardingKeyField',
  component: OnboardingKeyField,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { provider: 'openrouter', onProviderChange: () => undefined, value: '', onChange: () => undefined, status: 'idle' },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof OnboardingKeyField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty, before a key is typed. */
export const Empty: Story = {};

/** The key is being checked. */
export const Validating: Story = { args: { value: 'sk-or-v1-0000', status: 'validating' } };

/** An OpenRouter key that works. */
export const Valid: Story = { args: { value: 'sk-or-v1-0000', status: 'valid' } };

/** A key the provider rejected. */
export const Invalid: Story = { args: { provider: 'openai', value: 'sk-wrong', status: 'invalid', error: 'Invalid API key (401 Unauthorized)' } };

/** Interactive: typing and choosing a provider. */
export const Interactive: Story = {
  render: function Render() {
    const [provider, setProvider] = React.useState<OnboardingKeyProvider>('openrouter');
    const [value, setValue] = React.useState('');
    return <OnboardingKeyField provider={provider} onProviderChange={setProvider} value={value} onChange={setValue} status={value ? 'valid' : 'idle'} />;
  },
};
