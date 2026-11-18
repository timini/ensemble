import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { RunHistory, type RunHistoryItem } from './RunHistory';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const items: RunHistoryItem[] = [
  { id: 'run-2', date: 'Today, 09:41', models: ['Claude Sonnet 5.5', 'GPT-6 Luna', 'Gemini 3.5 Flash Lite'], calls: 7, amount: '$0.09' },
  { id: 'run-1', date: 'Yesterday, 17:02', models: ['GPT-6 Luna'], calls: 1, amount: '$0.0012' },
];

describe('RunHistory', () => {
  it('lists runs with their models, calls and charge', () => {
    renderWithI18n(<RunHistory items={items} status="ready" />);
    expect(screen.getByRole('heading', { name: 'Recent runs' })).toBeInTheDocument();
    const row = screen.getByTestId('run-history-item-run-2');
    expect(row).toHaveTextContent('Today, 09:41');
    expect(row).toHaveTextContent('Claude Sonnet 5.5, GPT-6 Luna, Gemini 3.5 Flash Lite');
    expect(row).toHaveTextContent('7 calls');
    expect(screen.getByTestId('run-history-amount-run-2')).toHaveTextContent('$0.09');
    expect(screen.getByTestId('run-history-item-run-1')).toHaveTextContent('1 call');
  });

  it('loads more runs', () => {
    const onLoadMore = vi.fn();
    renderWithI18n(<RunHistory items={items} status="ready" hasMore onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByTestId('run-history-more'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('explains the list before the first run', () => {
    renderWithI18n(<RunHistory items={[]} status="ready" />);
    expect(screen.getByTestId('run-history-empty')).toHaveTextContent('Runs you make in Pro show here');
  });

  it('renders in French', () => {
    renderWithI18n(<RunHistory items={items} status="ready" />, { language: 'fr' });
    expect(screen.getByRole('heading', { name: 'Requêtes récentes' })).toBeInTheDocument();
    expect(screen.getByTestId('run-history-item-run-2')).toHaveTextContent('7 appels');
  });
});
