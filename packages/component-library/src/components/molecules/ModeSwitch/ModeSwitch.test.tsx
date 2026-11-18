import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ModeSwitch, type ModeSwitchProps } from './ModeSwitch';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

function setup(overrides: Partial<ModeSwitchProps> = {}, language: 'en' | 'fr' = 'en') {
  const props: ModeSwitchProps = { mode: 'free', onModeChange: vi.fn(), proAvailable: true, ...overrides };
  const result = renderWithI18n(<ModeSwitch {...props} />, { language });
  return { props, ...result };
}

describe('ModeSwitch', () => {
  it('offers Free and Pro as a radio group with a line on each', () => {
    setup();
    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBe(screen.getByTestId('mode-switch-group'));
    const free = screen.getByTestId('mode-switch-free');
    const pro = screen.getByTestId('mode-switch-pro');
    expect(free).toHaveAttribute('aria-checked', 'true');
    expect(pro).toHaveAttribute('aria-checked', 'false');
    expect(free).toHaveTextContent('Your own keys or local models, called from your browser.');
    expect(pro).toHaveTextContent('Sign in and pay with credits. No keys needed; models run on our server.');
  });

  it('says switching keeps presets and history', () => {
    setup();
    expect(screen.getByTestId('mode-switch')).toHaveTextContent('Switching keeps your presets and history.');
  });

  it('changes mode on click', () => {
    const { props } = setup();
    fireEvent.click(screen.getByTestId('mode-switch-pro'));
    expect(props.onModeChange).toHaveBeenCalledWith('pro');
  });

  it('moves and selects with the arrow keys, with one tab stop', () => {
    const { props } = setup();
    const free = screen.getByTestId('mode-switch-free');
    expect(free).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('mode-switch-pro')).toHaveAttribute('tabindex', '-1');
    free.focus();
    fireEvent.keyDown(free, { key: 'ArrowDown' });
    expect(props.onModeChange).toHaveBeenCalledWith('pro');
    expect(screen.getByTestId('mode-switch-pro')).toHaveFocus();
  });

  it('shows the Pro panel only while Pro is chosen', () => {
    const panel = <div data-testid="sign-in" />;
    const { rerender, props } = setup({ proPanel: panel });
    expect(screen.queryByTestId('mode-switch-pro-panel')).not.toBeInTheDocument();
    rerender(<ModeSwitch {...props} mode="pro" proPanel={panel} />);
    expect(screen.getByTestId('mode-switch-pro-panel')).toContainElement(screen.getByTestId('sign-in'));
  });

  it('disables Pro with a note when the server has no sign-in', () => {
    const { props } = setup({ proAvailable: false });
    const pro = screen.getByTestId('mode-switch-pro');
    expect(pro).toBeDisabled();
    expect(pro).toHaveAttribute('aria-describedby', screen.getByTestId('mode-switch-unavailable').id);
    expect(screen.getByTestId('mode-switch-unavailable')).toHaveTextContent('Pro is not available on this server.');
    fireEvent.click(pro);
    fireEvent.keyDown(screen.getByTestId('mode-switch-free'), { key: 'ArrowDown' });
    expect(props.onModeChange).not.toHaveBeenCalled();
  });

  it('renders in French', () => {
    setup({}, 'fr');
    expect(screen.getByTestId('mode-switch-free')).toHaveTextContent('Gratuit');
  });
});
