import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { AppearanceSettings } from './AppearanceSettings';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('AppearanceSettings', () => {
  it('shows the theme and language as radio groups with the current choice checked', () => {
    renderWithI18n(<AppearanceSettings theme="dark" onThemeChange={() => undefined} language="en" onLanguageChange={() => undefined} />);
    const theme = screen.getByRole('radiogroup', { name: 'Theme' });
    expect(within(theme).getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(within(theme).getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false');
    const language = screen.getByRole('radiogroup', { name: 'Language' });
    expect(within(language).getAllByRole('radio')).toHaveLength(2);
    expect(within(language).getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
  });

  it('changes the theme', () => {
    const onThemeChange = vi.fn();
    renderWithI18n(<AppearanceSettings theme="light" onThemeChange={onThemeChange} language="en" onLanguageChange={() => undefined} />);
    fireEvent.click(screen.getByTestId('theme-dark'));
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('changes the language, naming each language in its own words', () => {
    const onLanguageChange = vi.fn();
    renderWithI18n(<AppearanceSettings theme="light" onThemeChange={() => undefined} language="en" onLanguageChange={onLanguageChange} />);
    fireEvent.click(screen.getByTestId('language-fr'));
    expect(screen.getByTestId('language-fr')).toHaveTextContent('Français');
    expect(onLanguageChange).toHaveBeenCalledWith('fr');
  });

  it('moves the choice with the arrow keys', () => {
    const onThemeChange = vi.fn();
    renderWithI18n(<AppearanceSettings theme="light" onThemeChange={onThemeChange} language="en" onLanguageChange={() => undefined} />);
    fireEvent.keyDown(screen.getByTestId('theme-light'), { key: 'ArrowRight' });
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });
});
