import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseCardSkeleton } from './ResponseCardSkeleton';

describe('ResponseCardSkeleton', () => {
  it('renders with model name and provider', () => {
    render(
      <ResponseCardSkeleton
        modelName="GPT-4"
        provider="openai"
        testId="skeleton-1"
      />
    );

    expect(screen.getByTestId('skeleton-1')).toBeInTheDocument();
    expect(screen.getByText('GPT-4')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByTestId('provider-logo-openai')).toBeInTheDocument();
    expect(screen.getByTestId('model-logo-openai')).toBeInTheDocument();
  });

  it('maps provider keys to display names', () => {
    const { rerender } = render(
      <ResponseCardSkeleton modelName="Claude" provider="anthropic" />
    );
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByTestId('model-logo-anthropic')).toHaveAttribute('data-logo-key', 'claude');

    rerender(
      <ResponseCardSkeleton modelName="Gemini" provider="google" />
    );
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByTestId('model-logo-google')).toHaveAttribute('data-logo-key', 'gemini');
  });

  it('renders aria-busy for loading state', () => {
    render(
      <ResponseCardSkeleton
        modelName="GPT-4"
        provider="openai"
        testId="busy-skeleton"
      />
    );
    expect(screen.getByTestId('busy-skeleton')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders pulse animation placeholders', () => {
    render(
      <ResponseCardSkeleton modelName="GPT-4" provider="openai" testId="pulse-test" />
    );
    expect(screen.getByTestId('skeleton-pulse')).toBeInTheDocument();
  });
});
