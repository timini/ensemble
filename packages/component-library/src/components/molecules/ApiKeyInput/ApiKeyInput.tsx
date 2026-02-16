import * as React from 'react';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../atoms/Input';
import { Label } from '../../atoms/Label';
import { LoadingSpinner } from '../../atoms/LoadingSpinner';
import { InlineAlert } from '../../atoms/InlineAlert';
import { cn } from '@/lib/utils';

export type Provider = 'openai' | 'anthropic' | 'google' | 'xai';
export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export interface ApiKeyInputProps {
  /** AI provider for the API key */
  provider: Provider;
  /** Label text for the input */
  label: string;
  /** Current value of the API key */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text displayed below input */
  helperText?: string;
  /** Error message when validation fails */
  error?: string;
  /** Validation state */
  validationStatus: ValidationStatus;
  /** Whether the API key is visible */
  showKey?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Callback when show/hide toggle clicked */
  onToggleShow?: () => void;
}

/**
 * ApiKeyInput molecule for entering and validating provider API keys.
 *
 * Combines Input, Label, Icon, and LoadingSpinner atoms to create a complete
 * API key input experience with real-time validation feedback.
 *
 * @example
 * ```tsx
 * <ApiKeyInput
 *   provider="openai"
 *   label="OpenAI API Key"
 *   placeholder="sk-proj-..."
 *   validationStatus="valid"
 *   value={apiKey}
 *   onChange={setApiKey}
 *   onToggleShow={toggleVisibility}
 * />
 * ```
 */
export const ApiKeyInput = React.forwardRef<HTMLInputElement, ApiKeyInputProps>(
  (
    {
      provider,
      label,
      value = '',
      placeholder,
      helperText,
      error,
      validationStatus,
      showKey = false,
      disabled = false,
      onChange,
      onToggleShow,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const inputId = React.useId();
    const errorId = React.useId();
    const helperTextId = React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    const handleToggleShow = () => {
      onToggleShow?.();
    };

    // Determine which icon to show based on validation status
    const ValidationIcon = () => {
      if (validationStatus === 'validating') {
        return (
          <div data-validation="validating" className="flex items-center">
            <LoadingSpinner size="sm" />
          </div>
        );
      }

      if (validationStatus === 'valid') {
        return (
          <CheckCircle
            data-validation="valid"
            className="h-4 w-4 text-success"
            aria-label={t('molecules.apiKeyInput.validKey')}
          />
        );
      }

      if (validationStatus === 'invalid') {
        return (
          <XCircle
            data-validation="invalid"
            className="h-4 w-4 text-destructive"
            aria-label={t('molecules.apiKeyInput.invalidKey')}
          />
        );
      }

      return null;
    };

    return (
      <div className="w-full space-y-2" data-provider={provider} data-validation-status={validationStatus}>
        <Label htmlFor={inputId}>{label}</Label>

        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            type={showKey ? 'text' : 'password'}
            value={value}
            placeholder={placeholder}
            onChange={handleChange}
            disabled={disabled}
            aria-invalid={validationStatus === 'invalid' ? 'true' : undefined}
            aria-describedby={
              error
                ? errorId
                : helperText
                  ? helperTextId
                  : undefined
            }
            className={cn(
              'pr-20',
              validationStatus === 'valid' &&
                'border-success/50 bg-success/10 focus-visible:border-success focus-visible:ring-success/40',
              validationStatus === 'invalid' &&
                'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40',
              disabled && 'disabled:opacity-50'
            )}
          />

          {/* Right-side icons: validation status + show/hide toggle */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <ValidationIcon />

            <button
              type="button"
              onClick={handleToggleShow}
              disabled={disabled}
              aria-label={showKey ? t('molecules.apiKeyInput.hideKey') : t('molecules.apiKeyInput.showKey')}
              className={cn(
                'text-muted-foreground hover:text-foreground transition-colors',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Helper text or error message */}
        {helperText && !error && (
          <p id={helperTextId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}

        {error && validationStatus === 'invalid' && (
          <InlineAlert id={errorId} variant="error">
            {error}
          </InlineAlert>
        )}
      </div>
    );
  }
);

ApiKeyInput.displayName = 'ApiKeyInput';
