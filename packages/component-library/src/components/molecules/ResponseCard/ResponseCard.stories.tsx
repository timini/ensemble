import type { Meta, StoryObj } from '@storybook/react';
import { ResponseCard } from './ResponseCard';
import * as React from 'react';

const meta = {
  title: 'Molecules/ResponseCard',
  component: ResponseCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['streaming', 'complete', 'error'],
      description: 'Current status of the response',
    },
    responseType: {
      control: 'select',
      options: ['ai', 'manual'],
      description: 'Type of response (AI-generated or manual)',
    },
    provider: {
      control: 'select',
      options: ['openai', 'anthropic', 'google', 'xai', 'perplexity'],
      description: 'AI provider (for AI responses)',
    },
    rating: {
      control: { type: 'range', min: 0, max: 5, step: 1 },
      description: 'Star rating (0-5)',
    },
  },
} satisfies Meta<typeof ResponseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Streaming states
export const Streaming: Story = {
  args: {
    modelName: 'GPT-4',
    provider: 'openai',
    status: 'streaming',
    responseType: 'ai',
    content: 'This is a response that is currently being streamed from the AI model...',
  },
};

export const StreamingLong: Story = {
  args: {
    modelName: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    status: 'streaming',
    responseType: 'ai',
    content:
      'This is a longer response that demonstrates how the streaming animation works with more text. ' +
      'The content should appear to be gradually arriving from the AI model in real-time. ' +
      'This gives users visual feedback that the system is actively processing their request.',
  },
};

// Complete AI responses with rating and copy
export const CompleteShort: Story = {
  args: {
    modelName: 'GPT-4',
    provider: 'openai',
    status: 'complete',
    responseType: 'ai',
    content: 'This is a short, complete response with rating and copy features.',
    rating: 4,
    responseTime: '1248ms',
  },
};

export const CompleteLong: Story = {
  args: {
    modelName: 'Gemini Pro',
    provider: 'google',
    status: 'complete',
    responseType: 'ai',
    content:
      'This is a longer complete response that demonstrates how the component handles substantial amounts of text. ' +
      'The AI has finished generating this response, and it is now displayed in its entirety. ' +
      'Users can read through the full response at their own pace. ' +
      'The completion status indicates that no more content will be added to this response.',
    rating: 5,
    responseTime: '2156ms',
  },
};

export const CompleteWithRating: Story = {
  args: {
    modelName: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    status: 'complete',
    responseType: 'ai',
    content: 'Excellent response demonstrating the star rating system.',
    rating: 5,
    responseTime: '1568ms',
  },
};

export const CompleteCollapsed: Story = {
  args: {
    modelName: 'GPT-4',
    provider: 'openai',
    status: 'complete',
    responseType: 'ai',
    content: 'This response is initially collapsed. Click the expand button to view the full content.',
    rating: 3,
    responseTime: '984ms',
    defaultExpanded: false,
  },
};

// Error states, one per error kind. Each offers a retry for that model only.
export const ErrorNetwork: Story = {
  args: {
    modelName: 'GPT-4',
    provider: 'openai',
    status: 'error',
    responseType: 'ai',
    errorKind: 'provider_unavailable',
    error: 'OpenAI API error: 503 The server is overloaded.',
    onRetry: () => undefined,
  },
};

export const ErrorRateLimit: Story = {
  args: {
    modelName: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    status: 'error',
    responseType: 'ai',
    errorKind: 'rate_limited',
    retryAfterSeconds: 30,
    error: 'Anthropic API error: 429 Rate limit reached.',
    onRetry: () => undefined,
  },
};

export const ErrorInvalidKey: Story = {
  args: {
    modelName: 'Gemini Pro',
    provider: 'google',
    status: 'error',
    responseType: 'ai',
    errorKind: 'invalid_key',
    error: 'Google API error: [401 Unauthorized] API key not valid.',
    onRetry: () => undefined,
  },
};

export const ErrorTimeout: Story = {
  args: {
    modelName: 'Grok 4.7',
    provider: 'xai',
    status: 'error',
    responseType: 'ai',
    errorKind: 'timeout',
    error: 'Streaming timeout for xai after 120s. The API may be unresponsive.',
    onRetry: () => undefined,
  },
};

export const ErrorInterrupted: Story = {
  args: {
    modelName: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    status: 'error',
    responseType: 'ai',
    errorKind: 'interrupted',
    onRetry: () => undefined,
  },
};

export const ErrorCancelled: Story = {
  args: {
    modelName: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    status: 'error',
    responseType: 'ai',
    errorKind: 'cancelled',
    onRetry: () => undefined,
  },
};

export const ErrorOther: Story = {
  args: {
    modelName: 'GPT-4',
    provider: 'openai',
    status: 'error',
    responseType: 'ai',
    error: 'OpenAI API error: 400 Unknown model.',
  },
};

// Manual responses
export const ManualComplete: Story = {
  args: {
    status: 'complete',
    responseType: 'manual',
    content:
      'This is a manually entered response. It was added by the user rather than generated by an AI model.',
    rating: 4,
    responseTime: '—',
  },
};

export const ManualLong: Story = {
  args: {
    status: 'complete',
    responseType: 'manual',
    content:
      'This is a longer manual response that demonstrates how user-entered content is displayed. ' +
      'Manual responses allow users to add their own insights or responses to compare against AI-generated content. ' +
      'This can be useful for testing, evaluation, or providing human baseline responses.',
    rating: 5,
  },
};

// Different providers
export const OpenAIComplete: Story = {
  args: {
    modelName: 'GPT-4 Turbo',
    provider: 'openai',
    status: 'complete',
    responseType: 'ai',
    content: 'Response from OpenAI GPT-4 Turbo model.',
    rating: 4,
    responseTime: '1102ms',
  },
};

export const AnthropicComplete: Story = {
  args: {
    modelName: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    status: 'complete',
    responseType: 'ai',
    content: 'Response from Anthropic Claude 3.5 Sonnet model.',
    rating: 5,
    responseTime: '1456ms',
  },
};

export const GoogleComplete: Story = {
  args: {
    modelName: 'Gemini Pro',
    provider: 'google',
    status: 'complete',
    responseType: 'ai',
    content: 'Response from Google Gemini Pro model.',
    rating: 4,
    responseTime: '982ms',
  },
};

export const XAIComplete: Story = {
  args: {
    modelName: 'Grok',
    provider: 'xai',
    status: 'complete',
    responseType: 'ai',
    content: 'Response from XAI Grok model.',
    rating: 3,
    responseTime: '1789ms',
  },
};

// Interactive example with rating
export const Interactive: Story = {
  args: {
    modelName: 'GPT-4',
    provider: 'openai',
    status: 'complete',
    responseType: 'ai',
    content: 'Rate this response and try the copy and expand/collapse buttons.',
    responseTime: '1234ms',
  },
  render: function Render(args) {
    const [rating, setRating] = React.useState(0);
    const [copyFeedback, setCopyFeedback] = React.useState(false);

    const handleCopy = () => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    };

    return (
      <div className="w-full max-w-2xl">
        <ResponseCard
          {...args}
          rating={rating}
          onRatingChange={setRating}
          onCopy={handleCopy}
        />
        {copyFeedback && (
          <p className="mt-2 text-sm text-success">Copied to clipboard!</p>
        )}
      </div>
    );
  },
};

// All states showcase
export const AllStates: Story = {
  args: {
    modelName: 'GPT-4',
    provider: 'openai',
    status: 'complete',
    responseType: 'ai',
    content: 'Example content',
  },
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-2xl">
      <ResponseCard
        modelName="GPT-4"
        provider="openai"
        status="streaming"
        responseType="ai"
        content="This response is currently streaming..."
      />
      <ResponseCard
        modelName="Claude 3.5 Sonnet"
        provider="anthropic"
        status="complete"
        responseType="ai"
        content="This is a complete AI-generated response with rating and actions."
        rating={4}
        responseTime="1456ms"
      />
      <ResponseCard
        modelName="Gemini Pro"
        provider="google"
        status="error"
        responseType="ai"
        error="Failed to generate response"
      />
      <ResponseCard
        status="complete"
        responseType="manual"
        content="This is a manual response entered by the user."
        rating={5}
      />
    </div>
  ),
};
