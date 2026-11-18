import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { BenchmarkResultsTable, type BenchmarkResultRow } from './BenchmarkResultsTable';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const rows: BenchmarkResultRow[] = [
  { id: 'single:a', kind: 'single', label: 'Model A', accuracy: 0.7, ciLower: 0.6, ciUpper: 0.8, pValue: null, isBest: true, costUsd: 0.1234, costIncomplete: false, failures: 0 },
  { id: 'ensemble:majority', kind: 'ensemble', label: 'Ensemble, majority', accuracy: 0.75, ciLower: 0.65, ciUpper: 0.84, pValue: 0.0004, isBest: false, costUsd: 0.5, costIncomplete: false, failures: 2 },
  { id: 'reference', kind: 'reference', label: 'Reference', accuracy: 0.9, ciLower: 0.85, ciUpper: 0.93, pValue: 0.0312, isBest: false, costUsd: 3, costIncomplete: true, failures: 1 },
  { id: 'single:b', kind: 'single', label: 'Model B', accuracy: 0.5, ciLower: 0.4, ciUpper: 0.6, pValue: null, isBest: false, costUsd: 0, costIncomplete: false, failures: 0 },
];

const rowById = (id: string) =>
  screen.getAllByTestId('benchmark-result-row').find((row) => row.getAttribute('data-config-id') === id)!;

describe('BenchmarkResultsTable', () => {
  it('lets keyboard users reach the scrollable table', () => {
    renderWithI18n(<BenchmarkResultsTable title="GSM8K" n={200} rows={rows} />);
    const region = screen.getByRole('region', { name: 'GSM8K' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('shows the dataset name and question count', () => {
    renderWithI18n(<BenchmarkResultsTable title="GSM8K" n={200} rows={rows} />);
    expect(screen.getByTestId('benchmark-results-title')).toHaveTextContent('GSM8K');
    expect(screen.getByTestId('benchmark-results-n')).toHaveTextContent('200 questions');
  });

  it('lists every configuration with its kind and accuracy interval', () => {
    renderWithI18n(<BenchmarkResultsTable title="GSM8K" n={200} rows={rows} />);
    expect(screen.getAllByTestId('benchmark-result-row')).toHaveLength(4);
    const ensemble = rowById('ensemble:majority');
    expect(within(ensemble).getByTestId('benchmark-result-kind')).toHaveTextContent('Ensemble');
    expect(within(ensemble).getByTestId('accuracy-interval-value')).toHaveTextContent('75.0%');
  });

  it('marks the best single model and formats p-values', () => {
    renderWithI18n(<BenchmarkResultsTable title="GSM8K" n={200} rows={rows} />);
    expect(rowById('single:a')).toHaveAttribute('data-best', 'true');
    expect(within(rowById('single:a')).getByTestId('benchmark-result-p')).toHaveTextContent('Best single model');
    expect(within(rowById('ensemble:majority')).getByTestId('benchmark-result-p')).toHaveTextContent('<0.001');
    expect(within(rowById('reference')).getByTestId('benchmark-result-p')).toHaveTextContent('0.031');
    expect(within(rowById('single:b')).getByTestId('benchmark-result-p')).toHaveTextContent('Not tested');
  });

  it('formats cost in the reader\'s language', () => {
    renderWithI18n(<BenchmarkResultsTable title="GSM8K" n={200} rows={rows} />, { language: 'fr' });
    const usd = new Intl.NumberFormat('fr', { style: 'currency', currency: 'USD' }).format(3).replace(/\s/g, ' ');
    expect(within(rowById('reference')).getByTestId('benchmark-result-cost')).toHaveTextContent(`au moins ${usd}`);
  });

  it('shows cost, marks a lower bound and counts failures', () => {
    renderWithI18n(<BenchmarkResultsTable title="GSM8K" n={200} rows={rows} />);
    expect(within(rowById('single:a')).getByTestId('benchmark-result-cost')).toHaveTextContent('$0.12');
    expect(within(rowById('reference')).getByTestId('benchmark-result-cost')).toHaveTextContent('at least $3.00');
    expect(within(rowById('ensemble:majority')).getByTestId('benchmark-result-failures')).toHaveTextContent('2 failed calls');
    expect(within(rowById('single:a')).queryByTestId('benchmark-result-failures')).not.toBeInTheDocument();
  });

  it('translates headers into French', () => {
    renderWithI18n(<BenchmarkResultsTable title="GSM8K" n={1} rows={rows} />, { language: 'fr' });
    expect(screen.getByTestId('benchmark-results-n')).toHaveTextContent('1 question');
    expect(screen.getByRole('table')).toHaveTextContent('Exactitude (IC 95 %)');
  });
});
