import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeyInput } from './ApiKeyInput';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('ApiKeyInput', () => {
  describe('rendering', () => {
    it('renders label', () => {
      render(<ApiKeyInput provider="openai" label="OpenAI API Key" validationStatus="idle" />);
      expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    });

    it('renders input field', () => {
      render(<ApiKeyInput provider="openai" label="API Key" validationStatus="idle" />);
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    it('renders placeholder text', () => {
      render(<ApiKeyInput provider="openai" label="API Key" placeholder="sk-..." validationStatus="idle" />);
      expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
    });

    it('renders with value', () => {
      render(<ApiKeyInput provider="openai" label="API Key" value="sk-1234" validationStatus="idle" />);
      expect(screen.getByLabelText('API Key')).toHaveValue('sk-1234');
    });

    it('renders helper text when provided', () => {
      render(<ApiKeyInput provider="openai" label="API Key" helperText="Find your key at..." validationStatus="idle" />);
      expect(screen.getByText('Find your key at...')).toBeInTheDocument();
    });

    it('renders error message when invalid', () => {
      render(<ApiKeyInput provider="openai" label="API Key" validationStatus="invalid" error="Invalid key format" />);
      expect(screen.getByText('Invalid key format')).toBeInTheDocument();
    });
  });

  describe('validation states', () => {
    it('shows no validation indicator when idle', () => {
      const { container } = render(<ApiKeyInput provider="openai" label="API Key" validationStatus="idle" />);
      const validIcon = container.querySelector('[data-validation="valid"]');
      const invalidIcon = container.querySelector('[data-validation="invalid"]');
      const loadingIcon = container.querySelector('[data-validation="validating"]');

      expect(validIcon).not.toBeInTheDocument();
      expect(invalidIcon).not.toBeInTheDocument();
      expect(loadingIcon).not.toBeInTheDocument();
    });

    it('shows loading spinner when validating', () => {
      const { container } = render(<ApiKeyInput provider="openai" label="API Key" validationStatus="validating" value="sk-test" />);
      const loadingIcon = container.querySelector('[data-validation="validating"]');
      expect(loadingIcon).toBeInTheDocument();
    });

    it('shows checkmark icon when valid', () => {
      const { container } = render(<ApiKeyInput provider="openai" label="API Key" validationStatus="valid" value="sk-valid" />);
      const validIcon = container.querySelector('[data-validation="valid"]');
      expect(validIcon).toBeInTheDocument();
    });

    it('shows error icon when invalid', () => {
      const { container } = render(<ApiKeyInput provider="openai" label="API Key" validationStatus="invalid" value="invalid" error="Bad key" />);
      const invalidIcon = container.querySelector('[data-validation="invalid"]');
      expect(invalidIcon).toBeInTheDocument();
    });
  });

  describe('show/hide functionality', () => {
    it('masks input by default', () => {
      render(<ApiKeyInput provider="openai" label="API Key" value="sk-secret" validationStatus="idle" />);
      const input = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(input.type).toBe('password');
    });

    it('shows input when showKey is true', () => {
      render(<ApiKeyInput provider="openai" label="API Key" value="sk-secret" showKey={true} validationStatus="idle" />);
      const input = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(input.type).toBe('text');
    });

    it('renders toggle visibility button', () => {
      render(<ApiKeyInput provider="openai" label="API Key" validationStatus="idle" />);
      const toggleButton = screen.getByRole('button', { name: /show|hide/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('calls onToggleShow when toggle button clicked', async () => {
      const onToggleShow = vi.fn();
      render(<ApiKeyInput provider="openai" label="API Key" onToggleShow={onToggleShow} validationStatus="idle" />);

      const toggleButton = screen.getByRole('button', { name: /show|hide/i });
      await userEvent.click(toggleButton);

      expect(onToggleShow).toHaveBeenCalledOnce();
    });
  });

  describe('user interactions', () => {
    it('calls onChange when input value changes', async () => {
      const onChange = vi.fn();
      render(<ApiKeyInput provider="openai" label="API Key" onChange={onChange} validationStatus="idle" />);

      const input = screen.getByLabelText('API Key');
      await userEvent.type(input, 'test');

      // onChange is called for each character typed
      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls.length).toBeGreaterThan(0);
    });

    it('updates value when controlled', async () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <ApiKeyInput provider="openai" label="API Key" value="" onChange={onChange} validationStatus="idle" />
      );

      const input = screen.getByLabelText('API Key');
      await userEvent.type(input, 'a');

      // Rerender with new value
      rerender(<ApiKeyInput provider="openai" label="API Key" value="a" onChange={onChange} validationStatus="idle" />);
      expect(input).toHaveValue('a');
    });

    it('does not call onChange when disabled', async () => {
      const onChange = vi.fn();
      render(<ApiKeyInput provider="openai" label="API Key" disabled onChange={onChange} validationStatus="idle" />);

      const input = screen.getByLabelText('API Key');
      expect(input).toBeDisabled();

      // Try to type (should not work)
      await userEvent.type(input, 'sk-test');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('provider-specific behavior', () => {
    it('applies correct provider context for OpenAI', () => {
      const { container } = render(<ApiKeyInput provider="openai" label="API Key" validationStatus="idle" />);
      expect(container.querySelector('[data-provider="openai"]')).toBeInTheDocument();
    });

    it('applies correct provider context for Anthropic', () => {
      const { container } = render(<ApiKeyInput provider="anthropic" label="API Key" validationStatus="idle" />);
      expect(container.querySelector('[data-provider="anthropic"]')).toBeInTheDocument();
    });

    it('applies correct provider context for Google', () => {
      const { container } = render(<ApiKeyInput provider="google" label="API Key" validationStatus="idle" />);
      expect(container.querySelector('[data-provider="google"]')).toBeInTheDocument();
    });

    it('applies correct provider context for XAI', () => {
      const { container } = render(<ApiKeyInput provider="xai" label="API Key" validationStatus="idle" />);
      expect(container.querySelector('[data-provider="xai"]')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('associates label with input', () => {
      render(<ApiKeyInput provider="openai" label="OpenAI API Key" validationStatus="idle" />);
      const input = screen.getByLabelText('OpenAI API Key');
      expect(input).toHaveAccessibleName('OpenAI API Key');
    });

    it('adds aria-invalid when validation fails', () => {
      render(<ApiKeyInput provider="openai" label="API Key" validationStatus="invalid" error="Invalid" />);
      const input = screen.getByLabelText('API Key');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('does not add aria-invalid when valid', () => {
      render(<ApiKeyInput provider="openai" label="API Key" validationStatus="valid" />);
      const input = screen.getByLabelText('API Key');
      expect(input).not.toHaveAttribute('aria-invalid');
    });

    it('links error message to input with aria-describedby', () => {
      render(<ApiKeyInput provider="openai" label="API Key" validationStatus="invalid" error="Invalid format" />);
      const input = screen.getByLabelText('API Key');
      const errorId = input.getAttribute('aria-describedby');

      expect(errorId).toBeTruthy();
      // InlineAlert wraps the error text in a div, so we need to find the parent
      const errorElement = screen.getByText('Invalid format').closest('[role="alert"]');
      expect(errorElement).toHaveAttribute('id', errorId!);
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(<ApiKeyInput provider="openai" label="API Key" disabled validationStatus="idle" />);
      expect(screen.getByLabelText('API Key')).toBeDisabled();
    });

    it('disables toggle button when disabled', () => {
      render(<ApiKeyInput provider="openai" label="API Key" disabled validationStatus="idle" />);
      const toggleButton = screen.getByRole('button', { name: /show|hide/i });
      expect(toggleButton).toBeDisabled();
    });

    it('applies disabled styling', () => {
      render(<ApiKeyInput provider="openai" label="API Key" disabled validationStatus="idle" />);
      const input = screen.getByLabelText('API Key');
      expect(input).toHaveClass('disabled:opacity-50');
    });
  });

  describe('semantic tokens', () => {
    it('uses success token for valid border', () => {
      const { container } = render(
        <ApiKeyInput provider="openai" label="API Key" validationStatus="valid" value="sk-valid" />
      );
      const input = container.querySelector('input');
      expect(input).toHaveClass('border-success/50');
    });

    it('uses success token for valid background', () => {
      const { container } = render(
        <ApiKeyInput provider="openai" label="API Key" validationStatus="valid" value="sk-valid" />
      );
      const input = container.querySelector('input');
      expect(input).toHaveClass('bg-success/10');
    });

    it('uses destructive token for invalid border', () => {
      const { container } = render(
        <ApiKeyInput provider="openai" label="API Key" validationStatus="invalid" value="bad" error="Invalid" />
      );
      const input = container.querySelector('input');
      expect(input).toHaveClass('border-destructive');
    });

    it('uses success token for valid icon', () => {
      const { container } = render(
        <ApiKeyInput provider="openai" label="API Key" validationStatus="valid" value="sk-valid" />
      );
      const icon = container.querySelector('[data-validation="valid"]');
      expect(icon).toHaveClass('text-success');
    });

    it('uses destructive token for invalid icon', () => {
      const { container } = render(
        <ApiKeyInput provider="openai" label="API Key" validationStatus="invalid" value="bad" error="Invalid" />
      );
      const icon = container.querySelector('[data-validation="invalid"]');
      expect(icon).toHaveClass('text-destructive');
    });
  });

  describe('internationalization', () => {
    it('renders show key button label in English', () => {
      renderWithI18n(<ApiKeyInput provider="openai" label="API Key" validationStatus="idle" />, { language: 'en' });
      const toggleButton = screen.getByRole('button', { name: 'Show API key' });
      expect(toggleButton).toBeInTheDocument();
    });

    it('renders show key button label in French', () => {
      renderWithI18n(<ApiKeyInput provider="openai" label="API Key" validationStatus="idle" />, { language: 'fr' });
      const toggleButton = screen.getByRole('button', { name: 'Afficher la clé API' });
      expect(toggleButton).toBeInTheDocument();
    });

    it('renders hide key button label in English', () => {
      renderWithI18n(<ApiKeyInput provider="openai" label="API Key" showKey={true} validationStatus="idle" />, { language: 'en' });
      const toggleButton = screen.getByRole('button', { name: 'Hide API key' });
      expect(toggleButton).toBeInTheDocument();
    });

    it('renders hide key button label in French', () => {
      renderWithI18n(<ApiKeyInput provider="openai" label="API Key" showKey={true} validationStatus="idle" />, { language: 'fr' });
      const toggleButton = screen.getByRole('button', { name: 'Masquer la clé API' });
      expect(toggleButton).toBeInTheDocument();
    });

    it('renders valid key aria-label in English', () => {
      renderWithI18n(<ApiKeyInput provider="openai" label="API Key" validationStatus="valid" value="sk-valid" />, { language: 'en' });
      const validIcon = screen.getByLabelText('Valid API key');
      expect(validIcon).toBeInTheDocument();
    });

    it('renders valid key aria-label in French', () => {
      renderWithI18n(<ApiKeyInput provider="openai" label="API Key" validationStatus="valid" value="sk-valid" />, { language: 'fr' });
      const validIcon = screen.getByLabelText('Clé API valide');
      expect(validIcon).toBeInTheDocument();
    });

    it('renders invalid key aria-label in English', () => {
      renderWithI18n(<ApiKeyInput provider="openai" label="API Key" validationStatus="invalid" error="Error" />, { language: 'en' });
      const invalidIcon = screen.getByLabelText('Invalid API key');
      expect(invalidIcon).toBeInTheDocument();
    });

    it('renders invalid key aria-label in French', () => {
      renderWithI18n(<ApiKeyInput provider="openai" label="API Key" validationStatus="invalid" error="Error" />, { language: 'fr' });
      const invalidIcon = screen.getByLabelText('Clé API invalide');
      expect(invalidIcon).toBeInTheDocument();
    });
  });
});
