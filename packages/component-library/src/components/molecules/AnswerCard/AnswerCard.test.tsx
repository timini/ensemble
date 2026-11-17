import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { AnswerCard } from './AnswerCard';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('AnswerCard', () => {
  it('shows the model, provider, time, cost and the answer', () => {
    renderWithI18n(
      <AnswerCard modelName="GPT-6" provider="openai" status="complete" content="About **70 °C**." durationMs={3100} costUsd={0.0021} />,
    );
    const card = screen.getByRole('article', { name: 'GPT-6' });
    expect(card).toHaveAttribute('data-status', 'complete');
    expect(card).toHaveTextContent('OpenAI');
    expect(screen.getByTestId('answer-card-meta')).toHaveTextContent('3.1 s');
    expect(screen.getByTestId('answer-card-meta')).toHaveTextContent('$0.0021');
    expect(screen.getByText('70 °C').tagName).toBe('STRONG');
  });

  it('uses a provider label when given, for endpoints', () => {
    renderWithI18n(<AnswerCard modelName="qwen3:14b" provider="openai-compatible" providerLabel="Ollama" status="complete" content="x" />);
    expect(screen.getByRole('article')).toHaveTextContent('Ollama');
  });

  it('shows streaming text with a busy state and no copy button', () => {
    renderWithI18n(<AnswerCard modelName="GPT-6" provider="openai" status="streaming" content="About" />);
    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('answer-card-status')).toHaveTextContent('Streaming');
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.queryByTestId('answer-card-copy')).not.toBeInTheDocument();
  });

  it('shows a waiting state before the first token', () => {
    renderWithI18n(<AnswerCard modelName="GPT-6" provider="openai" status="waiting" />, { language: 'fr' });
    expect(screen.getByTestId('answer-card-status')).toHaveTextContent('En attente');
    expect(screen.getByTestId('answer-card-skeleton')).toBeInTheDocument();
  });

  it('shows the error for its kind and retries this model', () => {
    const onRetry = vi.fn();
    renderWithI18n(
      <AnswerCard modelName="GPT-6" provider="openai" status="error" errorKind="rate_limited" retryAfterSeconds={30} error="429" onRetry={onRetry} />,
    );
    expect(screen.getByTestId('response-error')).toHaveAttribute('data-error-kind', 'rate_limited');
    fireEvent.click(screen.getByTestId('retry-button'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('copies the answer and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onCopy = vi.fn();
    renderWithI18n(<AnswerCard modelName="GPT-6" provider="openai" status="complete" content="Answer" onCopy={onCopy} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('answer-card-copy'));
    });
    expect(writeText).toHaveBeenCalledWith('Answer');
    expect(onCopy).toHaveBeenCalledOnce();
    expect(screen.getByTestId('answer-card-copy')).toHaveTextContent('Copied');
  });

  it('marks an answer added by hand', () => {
    renderWithI18n(<AnswerCard modelName="My notes" kind="manual" status="complete" content="x" />);
    expect(screen.getByRole('article')).toHaveTextContent('Added by hand');
    expect(screen.getByRole('article')).toHaveAttribute('data-kind', 'manual');
  });
});
