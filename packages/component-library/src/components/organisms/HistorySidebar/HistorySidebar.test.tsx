import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { HistorySidebar, type HistorySidebarProps } from './HistorySidebar';
import { NOW, samplePresets, sampleHistory } from './fixtures';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

function setup(overrides: Partial<HistorySidebarProps> = {}, language: 'en' | 'fr' = 'en') {
  const props: HistorySidebarProps = {
    items: sampleHistory,
    presets: samplePresets,
    onSelect: vi.fn(),
    onDelete: vi.fn(),
    onSelectPreset: vi.fn(),
    onNewQuestion: vi.fn(),
    now: NOW,
    ...overrides,
  };
  renderWithI18n(<HistorySidebar {...props} />, { language });
  return props;
}

describe('HistorySidebar', () => {
  it('lists presets with their model counts', () => {
    const props = setup();
    const presets = screen.getByRole('region', { name: 'Presets' });
    expect(within(presets).getAllByTestId('history-preset')).toHaveLength(3);
    expect(presets).toHaveTextContent('Three frontier models');
    expect(presets).toHaveTextContent('3 models');
    fireEvent.click(within(presets).getByText('Cheap and fast'));
    expect(props.onSelectPreset).toHaveBeenCalledWith('p3');
  });

  it('groups runs by date and opens one', () => {
    const props = setup();
    expect(screen.getByRole('region', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Previous 7 days' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Older' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Does vitamin D help with winter tiredness?'));
    expect(props.onSelect).toHaveBeenCalledWith('r3');
  });

  it('marks the open run as current and shows its agreement level to screen readers', () => {
    setup({ activeId: 'r2' });
    const row = screen.getByText(/30-year fixed/).closest('button');
    expect(row).toHaveAttribute('aria-current', 'true');
    expect(row).toHaveTextContent('Low agreement');
  });

  it('deletes a run from a labelled button', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete "Postgres vs SQLite for a small internal tool"' }));
    expect(props.onDelete).toHaveBeenCalledWith('r4');
  });

  it('deletes a preset when allowed', () => {
    const onDeletePreset = vi.fn();
    setup({ onDeletePreset });
    fireEvent.click(screen.getByRole('button', { name: 'Delete preset Cheap and fast' }));
    expect(onDeletePreset).toHaveBeenCalledWith('p3');
  });

  it('filters runs and presets by the search text', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search history' }), { target: { value: 'local' } });
    expect(screen.getAllByTestId('history-preset')).toHaveLength(1);
    expect(screen.queryAllByTestId('history-item')).toHaveLength(0);
    expect(screen.getByTestId('history-no-matches')).toHaveTextContent('Nothing matches "local".');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'VITAMIN' } });
    expect(screen.getAllByTestId('history-item')).toHaveLength(1);
  });

  it('starts a new question', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'New question' }));
    expect(props.onNewQuestion).toHaveBeenCalledOnce();
  });

  it('explains where runs are kept when there are none', () => {
    setup({ items: [], presets: [] }, 'fr');
    expect(screen.getByTestId('history-empty')).toHaveTextContent('enregistrées dans ce navigateur');
    expect(screen.queryByRole('region', { name: 'Préréglages' })).not.toBeInTheDocument();
  });
});
