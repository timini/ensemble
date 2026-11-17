import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResponseErrorNotice } from './ResponseErrorNotice';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ResponseErrorNotice', () => {
  it.each([
    ['invalid_key', 'API key rejected'],
    ['rate_limited', 'Rate limit reached'],
    ['timeout', 'No answer in time'],
    ['provider_unavailable', 'Provider unavailable'],
    ['interrupted', 'Answer interrupted'],
    ['other', 'This model failed'],
  ] as const)('shows a title for %s', (kind, title) => {
    render(<ResponseErrorNotice kind={kind} />);
    const notice = screen.getByTestId('response-error');
    expect(notice).toHaveAttribute('data-error-kind', kind);
    expect(screen.getByTestId('response-error-title')).toHaveTextContent(title);
  });

  it('defaults to other when no kind is given', () => {
    render(<ResponseErrorNotice />);
    expect(screen.getByTestId('response-error')).toHaveAttribute('data-error-kind', 'other');
  });

  it('says when to retry after a rate limit', () => {
    render(<ResponseErrorNotice kind="rate_limited" retryAfterSeconds={30} />);
    expect(screen.getByTestId('response-error-description')).toHaveTextContent('30 seconds');
  });

  it('shows the provider detail', () => {
    render(<ResponseErrorNotice kind="other" detail="400 Unknown model" />);
    expect(screen.getByTestId('response-error-detail')).toHaveTextContent('400 Unknown model');
  });

  it('calls onRetry from the retry button', () => {
    const onRetry = vi.fn();
    render(<ResponseErrorNotice kind="timeout" onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId('retry-button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides the retry button without a handler', () => {
    render(<ResponseErrorNotice kind="timeout" />);
    expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
  });

  it('renders French text', () => {
    renderWithI18n(<ResponseErrorNotice kind="invalid_key" onRetry={vi.fn()} />, { language: 'fr' });
    expect(screen.getByTestId('response-error-title')).toHaveTextContent('Clé API refusée');
    expect(screen.getByTestId('retry-button')).toHaveTextContent('Réessayer');
  });
});
