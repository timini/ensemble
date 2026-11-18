import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AccountSection, type AccountSectionProps } from './AccountSection';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

function setup(overrides: Partial<AccountSectionProps> = {}, language: 'en' | 'fr' = 'en') {
  const props: AccountSectionProps = {
    title: 'Purchases',
    testId: 'purchases',
    status: 'ready',
    emptyText: 'No purchases yet.',
    itemCount: 1,
    children: <li>Row</li>,
    ...overrides,
  };
  renderWithI18n(<AccountSection {...props} />, { language });
  return props;
}

describe('AccountSection', () => {
  it('shows a titled list', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Purchases' })).toBeInTheDocument();
    expect(screen.getByTestId('purchases-list')).toHaveTextContent('Row');
    expect(screen.queryByTestId('purchases-more')).not.toBeInTheDocument();
  });

  it('says when the list is empty', () => {
    setup({ itemCount: 0, children: null });
    expect(screen.getByTestId('purchases-empty')).toHaveTextContent('No purchases yet.');
  });

  it('shows loading and error states', () => {
    setup({ status: 'loading' });
    expect(screen.getByTestId('purchases-loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an error', () => {
    setup({ status: 'error' });
    expect(screen.getByTestId('purchases-error')).toHaveTextContent('Could not load this list.');
  });

  it('loads more on request and disables the button while loading', () => {
    const onLoadMore = vi.fn();
    setup({ hasMore: true, onLoadMore });
    fireEvent.click(screen.getByTestId('purchases-more'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('marks the button busy while the next page loads', () => {
    setup({ hasMore: true, onLoadMore: vi.fn(), loadingMore: true });
    expect(screen.getByTestId('purchases-more')).toBeDisabled();
  });

  it('renders in French', () => {
    setup({ hasMore: true, onLoadMore: vi.fn() }, 'fr');
    expect(screen.getByTestId('purchases-more')).toHaveTextContent('Afficher plus');
  });
});
