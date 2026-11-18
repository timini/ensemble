import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ComposerSubmit } from './ComposerSubmit';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ComposerSubmit', () => {
  it('shows an Ask submit button', () => {
    renderWithI18n(<ComposerSubmit running={false} disabled={false} />);
    const ask = screen.getByTestId('composer-submit');
    expect(ask).toHaveAttribute('type', 'submit');
    expect(ask).toHaveAccessibleName('Ask');
    expect(ask).toBeEnabled();
  });

  it('can be disabled and described by a hint', () => {
    renderWithI18n(<ComposerSubmit running={false} disabled describedBy="hint-1" />);
    const ask = screen.getByTestId('composer-submit');
    expect(ask).toBeDisabled();
    expect(ask).toHaveAttribute('aria-describedby', 'hint-1');
  });

  it('shows Running, disabled, during a run without a stop handler', () => {
    renderWithI18n(<ComposerSubmit running disabled />);
    expect(screen.getByTestId('composer-submit')).toHaveAccessibleName('Running');
    expect(screen.queryByTestId('composer-stop')).not.toBeInTheDocument();
  });

  it('shows Stop in place of Ask during a run and calls onStop', () => {
    const onStop = vi.fn();
    renderWithI18n(<ComposerSubmit running disabled onStop={onStop} />);
    expect(screen.queryByTestId('composer-submit')).not.toBeInTheDocument();
    const stop = screen.getByTestId('composer-stop');
    expect(stop).toHaveAttribute('type', 'button');
    expect(stop).toHaveAccessibleName('Stop');
    fireEvent.click(stop);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('keeps Ask when not running, even with a stop handler', () => {
    renderWithI18n(<ComposerSubmit running={false} disabled={false} onStop={vi.fn()} />);
    expect(screen.getByTestId('composer-submit')).toBeInTheDocument();
    expect(screen.queryByTestId('composer-stop')).not.toBeInTheDocument();
  });

  it('renders in French', () => {
    const { rerender } = renderWithI18n(<ComposerSubmit running={false} disabled={false} />, { language: 'fr' });
    expect(screen.getByTestId('composer-submit')).toHaveAccessibleName('Demander');
    rerender(<ComposerSubmit running disabled onStop={vi.fn()} />);
    expect(screen.getByTestId('composer-stop')).toHaveAccessibleName('Arrêter');
  });
});
