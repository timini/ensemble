import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { ModelUsageList, type ModelUsageItem } from './ModelUsageList';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const items: ModelUsageItem[] = [
  { id: 'anthropic/claude', name: 'Claude Sonnet 5.5', runs: 14, calls: 41, tokens: '182k', amount: '$1.84', share: 0.62 },
  { id: 'openai/luna', name: 'GPT-6 Luna', runs: 1, calls: 1, tokens: '5k', amount: '$0.01', share: 0.01 },
];

describe('ModelUsageList', () => {
  it('shows each model with its runs, calls, tokens, credits and share', () => {
    renderWithI18n(<ModelUsageList items={items} days={30} status="ready" />);
    expect(screen.getByRole('heading', { name: 'Usage by model, last 30 days' })).toBeInTheDocument();
    const row = screen.getByTestId('model-usage-item-anthropic/claude');
    expect(row).toHaveTextContent('Claude Sonnet 5.5');
    expect(row).toHaveTextContent('$1.84');
    expect(row).toHaveTextContent('14 runs, 41 calls, 182k tokens');
    expect(screen.getByTestId('model-usage-item-openai/luna')).toHaveTextContent('1 run, 1 call, 5k tokens');
    expect(screen.getByTestId('model-usage-bar-anthropic/claude')).toHaveStyle({ width: '62%' });
  });

  it('notes when only the newest runs are counted', () => {
    renderWithI18n(<ModelUsageList items={items} days={30} status="ready" truncated />);
    expect(screen.getByTestId('model-usage-truncated')).toBeInTheDocument();
  });

  it('says when there was no Pro run in the period', () => {
    renderWithI18n(<ModelUsageList items={[]} days={30} status="ready" />);
    expect(screen.getByTestId('model-usage-empty')).toHaveTextContent('No Pro runs in the last 30 days.');
  });

  it('uses the singular for a one-day period', () => {
    renderWithI18n(<ModelUsageList items={[]} days={1} status="ready" />);
    expect(screen.getByRole('heading', { name: 'Usage by model, last day' })).toBeInTheDocument();
  });

  it('renders in French', () => {
    renderWithI18n(<ModelUsageList items={items} days={30} status="ready" />, { language: 'fr' });
    expect(screen.getByRole('heading', { name: 'Utilisation par modèle, 30 derniers jours' })).toBeInTheDocument();
    expect(screen.getByTestId('model-usage-item-anthropic/claude')).toHaveTextContent('14 requêtes, 41 appels, 182k jetons');
  });
});
