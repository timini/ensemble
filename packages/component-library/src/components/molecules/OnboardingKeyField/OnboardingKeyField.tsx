import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import { cn } from '../../../lib/utils';

/** Where a key in onboarding goes: OpenRouter (an endpoint) or one of the six key providers. */
export type OnboardingKeyProvider = 'openrouter' | 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek' | 'perplexity';

export type OnboardingKeyStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export const ONBOARDING_KEY_PROVIDERS: readonly OnboardingKeyProvider[] = [
  'openrouter',
  'openai',
  'anthropic',
  'google',
  'xai',
  'deepseek',
  'perplexity',
];

/** Brand names, which are not translated. */
const NAMES: Record<OnboardingKeyProvider, string> = {
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
  deepseek: 'DeepSeek',
  perplexity: 'Perplexity',
};

export interface OnboardingKeyFieldProps {
  provider: OnboardingKeyProvider;
  onProviderChange: (provider: OnboardingKeyProvider) => void;
  value: string;
  onChange: (value: string) => void;
  /** Result of checking the key with its provider. */
  status: OnboardingKeyStatus;
  /** What the provider said when the key failed. */
  error?: string;
  disabled?: boolean;
  className?: string;
}

const field =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-label text-foreground transition-colors duration-fast focus-ring disabled:opacity-50';

/**
 * OnboardingKeyField molecule: one API key, the provider it belongs to and
 * the result of checking it, inline. The app picks the provider from the
 * key's prefix where it can; the user can change it.
 *
 * @example
 * ```tsx
 * <OnboardingKeyField provider="openrouter" onProviderChange={setProvider}
 *   value={key} onChange={setKey} status="valid" />
 * ```
 */
export function OnboardingKeyField(props: OnboardingKeyFieldProps) {
  const { provider, status } = props;
  const { t } = useTranslation();
  const key = 'molecules.onboardingKeyField';
  const providerId = React.useId();
  const keyId = React.useId();
  const statusId = React.useId();
  const name = NAMES[provider];

  return (
    <div data-testid="onboarding-key-field" data-status={status} className={cn('space-y-3', props.className)}>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-1.5">
          <label htmlFor={providerId} className="block text-label font-medium">
            {t(`${key}.provider`)}
          </label>
          <select
            id={providerId}
            data-testid="onboarding-key-provider"
            value={provider}
            disabled={props.disabled}
            onChange={(e) => props.onProviderChange(e.target.value as OnboardingKeyProvider)}
            className={field}
          >
            {ONBOARDING_KEY_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {NAMES[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={keyId} className="block text-label font-medium">
            {t(`${key}.key`)}
          </label>
          <input
            id={keyId}
            data-testid="onboarding-key-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={props.value}
            disabled={props.disabled}
            placeholder={t(`${key}.placeholder`, { provider: name })}
            aria-describedby={statusId}
            aria-invalid={status === 'invalid' || undefined}
            onChange={(e) => props.onChange(e.target.value)}
            className={cn(
              field,
              'font-mono',
              status === 'valid' && 'border-success/60',
              status === 'invalid' && 'border-destructive/60',
            )}
          />
        </div>
      </div>
      <p id={statusId} data-testid="onboarding-key-status" aria-live="polite" className="min-h-5 text-caption">
        {status === 'validating' && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> {t(`${key}.validating`, { provider: name })}
          </span>
        )}
        {status === 'valid' && (
          <span className="inline-flex items-center gap-1.5 text-success">
            <Check className="size-3.5" aria-hidden="true" />
            {t(provider === 'openrouter' ? `${key}.validOpenRouter` : `${key}.valid`, { provider: name })}
          </span>
        )}
        {status === 'invalid' && (
          <span className="inline-flex items-start gap-1.5 text-destructive">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {props.error ? t(`${key}.invalidWithReason`, { provider: name, reason: props.error }) : t(`${key}.invalid`, { provider: name })}
          </span>
        )}
        {status === 'idle' && <span className="text-muted-foreground">{t(`${key}.hint`)}</span>}
      </p>
    </div>
  );
}
