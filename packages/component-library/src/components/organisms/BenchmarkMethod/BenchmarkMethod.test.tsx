import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { BenchmarkMethod, type BenchmarkMethodProps } from './BenchmarkMethod';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const props: BenchmarkMethodProps = {
  datasets: ['GSM8K', 'GPQA'],
  sample: 200,
  questionSeed: 42,
  optionSeed: 1729,
  models: [
    { label: 'Model A', spec: 'openrouter:a/a' },
    { label: 'Model B', spec: 'openrouter:b/b' },
  ],
  strategies: ['majority', 'standard'],
  summarizer: 'Model A',
  reference: { label: 'Big Model', spec: 'openrouter:big/big' },
  docsUrl: 'https://example.com/BENCHMARKS.md',
};

describe('BenchmarkMethod', () => {
  it('describes datasets, sampling and mechanical scoring', () => {
    renderWithI18n(<BenchmarkMethod {...props} />);
    expect(screen.getByTestId('benchmark-method-datasets')).toHaveTextContent(
      'Datasets: GSM8K, GPQA. Up to 200 questions each, sampled with seed 42.',
    );
    expect(screen.getByTestId('benchmark-method-scoring')).toHaveTextContent('shuffled with seed 1729');
  });

  it('names the models, ensemble methods and reference', () => {
    renderWithI18n(<BenchmarkMethod {...props} />);
    expect(screen.getByTestId('benchmark-method-models')).toHaveTextContent('Model A (openrouter:a/a), Model B (openrouter:b/b)');
    expect(screen.getByTestId('benchmark-method-ensemble')).toHaveTextContent(
      'mechanical majority vote, standard consensus written by Model A',
    );
    expect(screen.getByTestId('benchmark-method-reference')).toHaveTextContent('Big Model (openrouter:big/big)');
  });

  it('shows a reference with no results yet as coming soon', () => {
    renderWithI18n(<BenchmarkMethod {...props} referencePending />);
    expect(screen.getByTestId('benchmark-method-reference')).toHaveTextContent(
      'Premium reference: Big Model (openrouter:big/big). Coming soon.',
    );
    expect(screen.getByTestId('benchmark-method-reference')).not.toHaveTextContent('cached');
  });

  it('shows a pending reference as coming soon in French', () => {
    renderWithI18n(<BenchmarkMethod {...props} referencePending />, { language: 'fr' });
    expect(screen.getByTestId('benchmark-method-reference')).toHaveTextContent('Bientôt disponible');
  });

  it('explains the statistics and links the full method', () => {
    renderWithI18n(<BenchmarkMethod {...props} />);
    expect(screen.getByTestId('benchmark-method-statistics')).toHaveTextContent('Wilson');
    expect(screen.getByTestId('benchmark-method-statistics')).toHaveTextContent('McNemar');
    expect(screen.getByTestId('benchmark-method-docs')).toHaveAttribute('href', props.docsUrl);
  });

  it('translates into French', () => {
    renderWithI18n(<BenchmarkMethod {...props} />, { language: 'fr' });
    expect(screen.getByTestId('benchmark-method')).toHaveTextContent('Méthode');
  });
});
