import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AgreementRing } from './AgreementRing';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('AgreementRing', () => {
  it('shows the score out of 100 with an accessible label', () => {
    renderWithI18n(<AgreementRing score={0.862} level="high" />);
    const ring = screen.getByRole('img', { name: 'Agreement score 86 out of 100' });
    expect(ring).toHaveAttribute('data-level', 'high');
    expect(screen.getByTestId('agreement-ring-value')).toHaveTextContent('86');
  });

  it('clamps the arc to the 0 to 1 range', () => {
    renderWithI18n(<AgreementRing score={1.4} level="high" />);
    expect(screen.getByTestId('agreement-ring-value')).toHaveTextContent('100');
  });

  it.each([
    ['high', 'text-success'],
    ['medium', 'text-warning'],
    ['low', 'text-destructive'],
  ] as const)('colours the %s level', (level, tone) => {
    renderWithI18n(<AgreementRing score={0.5} level={level} />);
    expect(screen.getByTestId('agreement-ring-arc')).toHaveClass(tone);
  });

  it('shows a pending ring with no number', () => {
    renderWithI18n(<AgreementRing pending />);
    expect(screen.getByTestId('agreement-ring')).toHaveAttribute('data-pending', 'true');
    expect(screen.queryByTestId('agreement-ring-value')).not.toBeInTheDocument();
  });
});
