import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { ScoreGuide } from './ScoreGuide';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ScoreGuide', () => {
  it('explains each agreement level', () => {
    renderWithI18n(<ScoreGuide benchmarksHref="/benchmarks" />);
    expect(screen.getByTestId('score-guide-high')).toHaveTextContent('High agreement');
    expect(screen.getByTestId('score-guide-medium')).toHaveTextContent('Mixed agreement');
    expect(screen.getByTestId('score-guide-low')).toHaveTextContent('No single answer should be trusted');
  });

  it('links to the benchmarks', () => {
    renderWithI18n(<ScoreGuide benchmarksHref="/benchmarks" />);
    expect(screen.getByTestId('score-guide-benchmarks')).toHaveAttribute('href', '/benchmarks');
  });

  it('makes no accuracy claim', () => {
    renderWithI18n(<ScoreGuide benchmarksHref="/benchmarks" />);
    expect(screen.getByTestId('score-guide')).not.toHaveTextContent(/more accurate|better answers/i);
  });

  it('renders in French', () => {
    renderWithI18n(<ScoreGuide benchmarksHref="/benchmarks" />, { language: 'fr' });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ce que le score vous dit');
  });
});
