import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Logo } from './Logo';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('Logo', () => {
  it('shows the wordmark next to the mark', () => {
    renderWithI18n(<Logo />);
    expect(screen.getByTestId('logo')).toHaveTextContent('Ensemble');
    expect(screen.getByTestId('logo').querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('can show the mark alone with an accessible name', () => {
    renderWithI18n(<Logo wordmark={false} />);
    expect(screen.getByRole('img', { name: 'Ensemble' })).toBeInTheDocument();
  });
});
