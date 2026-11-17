import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AppShell } from './AppShell';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const realMatchMedia = window.matchMedia;

function desktop(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('AppShell', () => {
  it('has a header with a home link, the main content and a skip link', () => {
    renderWithI18n(<AppShell homeHref="/workspace">Content</AppShell>);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ensemble home' })).toHaveAttribute('href', '/workspace');
    expect(screen.getByRole('main')).toHaveTextContent('Content');
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', `#${screen.getByRole('main').id}`);
  });

  it('opens settings and renders the nav and account slots', () => {
    const onOpenSettings = vi.fn();
    renderWithI18n(
      <AppShell onOpenSettings={onOpenSettings} nav={<a href="/benchmarks">Benchmarks</a>} account={<button>Sign in</button>}>
        x
      </AppShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Benchmarks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('has no history button without a sidebar', () => {
    renderWithI18n(<AppShell>x</AppShell>);
    expect(screen.queryByTestId('app-shell-history-toggle')).not.toBeInTheDocument();
  });

  it('opens history in a sheet on small screens', () => {
    desktop(false);
    renderWithI18n(<AppShell sidebar={<p>Past runs</p>}>x</AppShell>);
    const toggle = screen.getByRole('button', { name: 'Show history' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('dialog', { name: 'History and presets' })).toHaveTextContent('Past runs');
  });

  it('toggles the sidebar on desktop', () => {
    desktop(true);
    renderWithI18n(<AppShell sidebar={<p>Past runs</p>}>x</AppShell>);
    const shell = screen.getByTestId('app-shell');
    expect(shell).toHaveAttribute('data-sidebar-open', 'true');
    const toggle = screen.getByRole('button', { name: 'Hide history' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(shell).toHaveAttribute('data-sidebar-open', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show history' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('lets the app control the history sheet', () => {
    desktop(false);
    const onHistoryOpenChange = vi.fn();
    renderWithI18n(
      <AppShell sidebar={<p>Past runs</p>} historyOpen onHistoryOpenChange={onHistoryOpenChange}>
        x
      </AppShell>,
      { language: 'fr' },
    );
    expect(screen.getByRole('dialog', { name: 'Historique et préréglages' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onHistoryOpenChange).toHaveBeenCalledWith(false);
  });
});
