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

  it('lists a run with no known time without a visible date heading or time', () => {
    setup({ items: [{ id: 'u1', prompt: 'Stored before run times were kept' }] });
    const region = screen.getByRole('region', { name: 'Runs with no date' });
    const row = within(region).getByTestId('history-item');
    expect(row).toHaveTextContent('Stored before run times were kept');
    expect(row.textContent).not.toMatch(/\d{1,2}:\d{2}/);
    expect(screen.queryByRole('region', { name: 'Today' })).not.toBeInTheDocument();
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
    expect(screen.queryByTestId('history-no-matches')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'VITAMIN' } });
    expect(screen.getAllByTestId('history-item')).toHaveLength(1);
  });

  it('gives the search box a test id', () => {
    setup();
    expect(screen.getByTestId('history-search')).toHaveAttribute('type', 'search');
  });

  it('finds a run by its answers and models, not only its prompt', () => {
    setup({ items: [{ ...sampleHistory[0]!, searchText: 'gpt-6-astra says about 71 degrees' }] });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search history' }), { target: { value: 'astra' } });
    expect(screen.getAllByTestId('history-item')).toHaveLength(1);
  });

  it('says nothing matches only when no run and no preset matches', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search history' }), { target: { value: 'zzz' } });
    expect(screen.queryAllByTestId('history-preset')).toHaveLength(0);
    expect(screen.getByTestId('history-no-matches')).toHaveTextContent('Nothing matches "zzz".');
  });

  it('says nothing matches with presets but no runs, instead of the empty text', () => {
    setup({ items: [] });
    expect(screen.getByTestId('history-empty')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search history' }), { target: { value: 'zzz' } });
    expect(screen.getByTestId('history-no-matches')).toHaveTextContent('Nothing matches "zzz".');
    expect(screen.queryByTestId('history-empty')).not.toBeInTheDocument();
  });

  it('keeps other runs shut while a run is in progress, and says why', () => {
    const props = setup({ activeId: sampleHistory[0]!.id, locked: true });
    const rows = screen.getAllByTestId('history-item');
    expect(within(rows[1]!).getByText(sampleHistory[1]!.prompt).closest('button')).toBeDisabled();
    fireEvent.click(within(rows[1]!).getByText(sampleHistory[1]!.prompt));
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(within(rows[0]!).getByText(sampleHistory[0]!.prompt).closest('button')).toBeEnabled();
    expect(screen.getByTestId('history-locked')).toHaveTextContent('Past runs open once every answer is in.');
  });

  it('opens runs and shows no note when not locked', () => {
    setup();
    expect(screen.queryByTestId('history-locked')).not.toBeInTheDocument();
    screen.getAllByTestId('history-item').forEach((row) => expect(within(row).getAllByRole('button')[0]).toBeEnabled());
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
