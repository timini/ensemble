import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ComposerOptions } from './ComposerOptions';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ComposerOptions', () => {
  it('opens a menu from a labelled button', () => {
    renderWithI18n(<ComposerOptions onAddManualResponse={() => undefined} onSavePreset={() => undefined} />);
    const trigger = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.getByRole('menuitem', { name: 'Add an answer by hand' })).toHaveFocus();
  });

  it('runs an item and closes', () => {
    const onAddManualResponse = vi.fn();
    renderWithI18n(<ComposerOptions onAddManualResponse={onAddManualResponse} />);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Add an answer by hand' }));
    expect(onAddManualResponse).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('only lists the actions it has handlers for', () => {
    const onSavePreset = vi.fn();
    renderWithI18n(<ComposerOptions onSavePreset={onSavePreset} />, { language: 'fr' });
    fireEvent.click(screen.getByRole('button', { name: "Plus d'options" }));
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(1);
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    fireEvent.click(items[0]);
    expect(onSavePreset).toHaveBeenCalledOnce();
  });

  it('renders nothing without any action', () => {
    const { container } = renderWithI18n(<ComposerOptions />);
    expect(container).toBeEmptyDOMElement();
  });
});
