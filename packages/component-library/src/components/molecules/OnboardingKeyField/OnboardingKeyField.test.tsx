import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { OnboardingKeyField, type OnboardingKeyFieldProps } from './OnboardingKeyField';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

const base: OnboardingKeyFieldProps = {
  provider: 'openrouter',
  onProviderChange: () => undefined,
  value: '',
  onChange: () => undefined,
  status: 'idle',
};

describe('OnboardingKeyField', () => {
  it('labels the provider and the key, and hides the key as typed', () => {
    renderWithI18n(<OnboardingKeyField {...base} />);
    expect(screen.getByLabelText('Provider')).toHaveValue('openrouter');
    expect(screen.getByLabelText('API key')).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('onboarding-key-status')).toHaveTextContent('One key is enough');
  });

  it('reports typing and a provider change', () => {
    const onChange = vi.fn();
    const onProviderChange = vi.fn();
    renderWithI18n(<OnboardingKeyField {...base} onChange={onChange} onProviderChange={onProviderChange} />);
    fireEvent.change(screen.getByTestId('onboarding-key-input'), { target: { value: 'sk-ant-1' } });
    expect(onChange).toHaveBeenCalledWith('sk-ant-1');
    fireEvent.change(screen.getByTestId('onboarding-key-provider'), { target: { value: 'anthropic' } });
    expect(onProviderChange).toHaveBeenCalledWith('anthropic');
  });

  it('shows the check in progress', () => {
    renderWithI18n(<OnboardingKeyField {...base} provider="openai" status="validating" />);
    expect(screen.getByTestId('onboarding-key-status')).toHaveTextContent('Checking the key with OpenAI');
  });

  it('confirms a working key, with what OpenRouter gives access to', () => {
    const { rerender } = renderWithI18n(<OnboardingKeyField {...base} status="valid" />);
    expect(screen.getByTestId('onboarding-key-status')).toHaveTextContent('models from every major provider');
    rerender(<OnboardingKeyField {...base} provider="google" status="valid" />);
    expect(screen.getByTestId('onboarding-key-status')).toHaveTextContent('The Google key works');
  });

  it('explains a failed key with the reason and marks the field invalid', () => {
    renderWithI18n(<OnboardingKeyField {...base} provider="openai" status="invalid" error="Invalid API key (401)" />);
    expect(screen.getByTestId('onboarding-key-status')).toHaveTextContent('OpenAI did not accept this key: Invalid API key (401)');
    expect(screen.getByTestId('onboarding-key-input')).toHaveAttribute('aria-invalid', 'true');
  });

  it('links to the page where the chosen provider issues keys, in a new tab', () => {
    const { rerender } = renderWithI18n(<OnboardingKeyField {...base} />);
    const link = screen.getByTestId('onboarding-key-get');
    expect(link).toHaveTextContent('Get a key from OpenRouter');
    expect(link).toHaveAttribute('href', 'https://openrouter.ai/keys');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    rerender(<OnboardingKeyField {...base} provider="anthropic" />);
    expect(screen.getByTestId('onboarding-key-get')).toHaveTextContent('Get a key from Anthropic');
    expect(screen.getByTestId('onboarding-key-get')).toHaveAttribute('href', 'https://console.anthropic.com/settings/keys');
  });

  it('drops the link once the key works', () => {
    renderWithI18n(<OnboardingKeyField {...base} status="valid" />);
    expect(screen.queryByTestId('onboarding-key-get')).not.toBeInTheDocument();
  });

  it('renders in French', () => {
    renderWithI18n(<OnboardingKeyField {...base} />, { language: 'fr' });
    expect(screen.getByLabelText('Fournisseur')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-key-get')).toHaveTextContent('Obtenir une clé chez OpenRouter');
  });
});
