import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { OnboardingSheet, type OnboardingSheetProps } from './OnboardingSheet';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

function props(overrides: Partial<OnboardingSheetProps> = {}): OnboardingSheetProps {
  return {
    open: true,
    onOpenChange: () => undefined,
    path: 'keys',
    onPathChange: () => undefined,
    keyField: { provider: 'openrouter', onProviderChange: () => undefined, value: '', onChange: () => undefined, status: 'idle' },
    local: { onOpenSettings: () => undefined },
    canStart: false,
    onStart: () => undefined,
    onSkip: () => undefined,
    ...overrides,
  };
}

describe('OnboardingSheet', () => {
  it('asks one question with keys, local and Pro, and Pro is not available yet', () => {
    renderWithI18n(<OnboardingSheet {...props()} />);
    expect(screen.getByRole('dialog', { name: 'How do you want to run models?' })).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-path-keys')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('onboarding-path-local')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('onboarding-path-pro')).toHaveTextContent('Coming soon');
    expect(screen.getByTestId('onboarding-key-field')).toBeInTheDocument();
  });

  it('switches path', () => {
    const onPathChange = vi.fn();
    renderWithI18n(<OnboardingSheet {...props({ onPathChange })} />);
    fireEvent.click(screen.getByTestId('onboarding-path-local'));
    expect(onPathChange).toHaveBeenCalledWith('local');
  });

  it('keeps Start disabled until something works, and always allows Skip', () => {
    const onSkip = vi.fn();
    const onStart = vi.fn();
    const { rerender } = renderWithI18n(<OnboardingSheet {...props({ onSkip, onStart })} />);
    expect(screen.getByTestId('onboarding-start')).toBeDisabled();
    fireEvent.click(screen.getByTestId('onboarding-skip'));
    expect(onSkip).toHaveBeenCalled();
    rerender(<OnboardingSheet {...props({ onSkip, onStart, canStart: true })} />);
    fireEvent.click(screen.getByTestId('onboarding-start'));
    expect(onStart).toHaveBeenCalled();
  });

  it('shows the Ollama offer on the local path, or a connected server', () => {
    const { rerender } = renderWithI18n(
      <OnboardingSheet {...props({ path: 'local', local: { notice: <div data-testid="ollama-notice" />, onOpenSettings: () => undefined } })} />,
    );
    expect(screen.getByTestId('ollama-notice')).toBeInTheDocument();
    rerender(
      <OnboardingSheet {...props({ path: 'local', local: { connected: { name: 'Ollama', models: 3 }, onOpenSettings: () => undefined } })} />,
    );
    expect(screen.getByTestId('onboarding-local-connected')).toHaveTextContent('Connected to Ollama. 3 models available.');
  });

  it('says what to do when no local server was found, and opens settings for others', () => {
    const onOpenSettings = vi.fn();
    renderWithI18n(<OnboardingSheet {...props({ path: 'local', local: { onOpenSettings } })} />);
    expect(screen.getByTestId('onboarding-local-none')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('onboarding-local-settings'));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('renders in French', () => {
    renderWithI18n(<OnboardingSheet {...props()} />, { language: 'fr' });
    expect(screen.getByTestId('onboarding-start')).toHaveTextContent('Commencer');
  });

  it('makes Pro a real path when a Pro panel is given', () => {
    const onPathChange = vi.fn();
    renderWithI18n(<OnboardingSheet {...props({ onPathChange, pro: { panel: <div data-testid="sign-in" /> } })} />);
    const pro = screen.getByTestId('onboarding-path-pro');
    expect(pro).toHaveAttribute('role', 'radio');
    expect(pro).toHaveAttribute('aria-checked', 'false');
    expect(pro).toHaveTextContent('Sign in for Pro');
    expect(pro).toHaveTextContent('Credits instead of keys. Every model, no setup.');
    expect(pro).not.toHaveTextContent('Coming soon');
    fireEvent.click(pro);
    expect(onPathChange).toHaveBeenCalledWith('pro');
  });

  it('shows the Pro panel on the Pro path', () => {
    renderWithI18n(<OnboardingSheet {...props({ path: 'pro', pro: { panel: <div data-testid="sign-in" /> } })} />);
    expect(screen.getByTestId('onboarding-path-pro')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('onboarding-panel-pro')).toContainElement(screen.getByTestId('sign-in'));
    expect(screen.queryByTestId('onboarding-key-field')).not.toBeInTheDocument();
  });

  it('keeps Pro as a disabled coming-soon card without a Pro panel', () => {
    renderWithI18n(<OnboardingSheet {...props()} />);
    const pro = screen.getByTestId('onboarding-path-pro');
    expect(pro).toHaveAttribute('aria-disabled', 'true');
    expect(pro).not.toHaveAttribute('role', 'radio');
  });

  it('renders the Pro path in French', () => {
    renderWithI18n(<OnboardingSheet {...props({ pro: { panel: null } })} />, { language: 'fr' });
    expect(screen.getByTestId('onboarding-path-pro')).toHaveTextContent('Tous les modèles, sans configuration.');
  });
});
