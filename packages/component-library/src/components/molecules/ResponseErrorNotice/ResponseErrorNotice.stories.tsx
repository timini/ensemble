import type { Meta, StoryObj } from '@storybook/react';
import { ResponseErrorNotice } from './ResponseErrorNotice';

const meta = {
  title: 'Molecules/ResponseErrorNotice',
  component: ResponseErrorNotice,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { onRetry: () => undefined },
  argTypes: {
    kind: {
      control: 'select',
      options: ['invalid_key', 'missing_key', 'rate_limited', 'timeout', 'provider_unavailable', 'interrupted', 'other'],
    },
  },
} satisfies Meta<typeof ResponseErrorNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The provider rejected the key (401 or 403). */
export const InvalidKey: Story = {
  args: { kind: 'invalid_key', detail: 'OpenAI API error: 401 Incorrect API key provided.' },
};

/** No key is set for the provider, so no request was sent. */
export const MissingKey: Story = {
  args: { kind: 'missing_key', detail: 'Missing API key for openai. Configure an API key on the configuration page.' },
};

/** 429 with a Retry-After header. */
export const RateLimited: Story = {
  args: { kind: 'rate_limited', retryAfterSeconds: 30, detail: '429 Rate limit reached for requests.' },
};

/** 429 without a delay from the provider. */
export const RateLimitedNoDelay: Story = {
  args: { kind: 'rate_limited' },
};

/** The client stopped waiting. */
export const Timeout: Story = {
  args: { kind: 'timeout', detail: 'Streaming timeout for anthropic after 120s.' },
};

/** 5xx or a network failure. */
export const ProviderUnavailable: Story = {
  args: { kind: 'provider_unavailable', detail: 'Google API error: [503 Service Unavailable]' },
};

/** The page was reloaded while the answer was streaming. */
export const Interrupted: Story = {
  args: { kind: 'interrupted' },
};

/** Any other failure. */
export const Other: Story = {
  args: { kind: 'other', detail: '400 Unknown model gpt-0.' },
};

/** No retry handler: the button is hidden. */
export const WithoutRetry: Story = {
  args: { kind: 'timeout', onRetry: undefined },
};
