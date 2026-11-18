import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AccuracyInterval } from './AccuracyInterval';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('AccuracyInterval', () => {
  it('shows the accuracy and its 95% interval in percent', () => {
    renderWithI18n(<AccuracyInterval accuracy={0.72} lower={0.6543} upper={0.7771} />);
    expect(screen.getByTestId('accuracy-interval-value')).toHaveTextContent('72.0%');
    expect(screen.getByTestId('accuracy-interval-range')).toHaveTextContent('95% CI 65.4 to 77.7');
  });

  it('draws the interval and the point on a 0 to 100 track', () => {
    renderWithI18n(<AccuracyInterval accuracy={0.5} lower={0.25} upper={0.75} />);
    const band = screen.getByTestId('accuracy-interval-band');
    expect(band.style.left).toBe('25%');
    expect(band.style.width).toBe('50%');
    expect(screen.getByTestId('accuracy-interval-point').style.left).toBe('50%');
  });

  it('has an accessible description', () => {
    renderWithI18n(<AccuracyInterval accuracy={0.5} lower={0.25} upper={0.75} />);
    expect(screen.getByRole('img')).toHaveAccessibleName('Accuracy 50.0%, 95% interval 25.0% to 75.0%');
  });

  it('marks a highlighted result', () => {
    renderWithI18n(<AccuracyInterval accuracy={0.5} lower={0.4} upper={0.6} highlighted />);
    expect(screen.getByTestId('accuracy-interval')).toHaveAttribute('data-highlighted', 'true');
  });

  it('translates into French', () => {
    renderWithI18n(<AccuracyInterval accuracy={0.5} lower={0.4} upper={0.6} />, { language: 'fr' });
    expect(screen.getByTestId('accuracy-interval-range')).toHaveTextContent('IC 95 % de 40.0 à 60.0');
  });
});
