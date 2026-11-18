import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { WaysIn } from './WaysIn';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('WaysIn', () => {
  it('links own keys and local models to where they start', () => {
    renderWithI18n(<WaysIn keysHref="/workspace?start=keys" localHref="/workspace?start=local" />);
    expect(screen.getByTestId('ways-in-keys')).toHaveAttribute('href', '/workspace?start=keys');
    expect(screen.getByTestId('ways-in-keys')).toHaveTextContent('Use your own keys');
    expect(screen.getByTestId('ways-in-local')).toHaveAttribute('href', '/workspace?start=local');
    expect(screen.getByTestId('ways-in-local')).toHaveTextContent('Use local models');
  });

  it('shows Pro as coming soon, not as a link, until it has a destination', () => {
    renderWithI18n(<WaysIn keysHref="/a" localHref="/b" />);
    const pro = screen.getByTestId('ways-in-pro');
    expect(pro.tagName).toBe('P');
    expect(pro).toHaveTextContent('Sign in for Pro');
    expect(pro).toHaveTextContent('Coming soon');
  });

  it('links Pro once it exists', () => {
    renderWithI18n(<WaysIn keysHref="/a" localHref="/b" proHref="/account" />);
    expect(screen.getByTestId('ways-in-pro')).toHaveAttribute('href', '/account');
    expect(screen.getByTestId('ways-in-pro')).not.toHaveTextContent('Coming soon');
  });

  it('renders in French', () => {
    renderWithI18n(<WaysIn keysHref="/a" localHref="/b" />, { language: 'fr' });
    expect(screen.getByTestId('ways-in-keys')).toHaveTextContent('Utiliser vos propres clés');
  });
});
