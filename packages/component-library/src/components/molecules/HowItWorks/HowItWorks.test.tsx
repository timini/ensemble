import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { HowItWorks } from './HowItWorks';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('HowItWorks', () => {
  it('lists three numbered steps', () => {
    renderWithI18n(<HowItWorks />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByTestId('how-it-works-ask')).toHaveTextContent('01Ask once');
    expect(screen.getByTestId('how-it-works-read')).toHaveTextContent('Read the agreement');
  });

  it('carries an anchor id', () => {
    renderWithI18n(<HowItWorks id="steps" />);
    expect(screen.getByTestId('how-it-works')).toHaveAttribute('id', 'steps');
  });

  it('renders in French', () => {
    renderWithI18n(<HowItWorks />, { language: 'fr' });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Comment ça marche');
  });
});
