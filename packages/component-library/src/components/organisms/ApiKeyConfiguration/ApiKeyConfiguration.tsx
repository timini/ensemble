import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ApiKeyInput, type Provider, type ValidationStatus } from '../../molecules/ApiKeyInput';
import { Heading } from '../../atoms/Heading';

export interface ApiKeyConfigurationItem {
  /** AI provider */
  provider: Provider;
  /** Label for the API key input */
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
}

export interface ApiKeyConfigurationProps {
  /** Array of API key configurations */
  items: ApiKeyConfigurationItem[];
  /** Callback when an API key value changes */
  onKeyChange: (provider: Provider, value: string) => void;
  /** Callback when show/hide toggle is clicked */
  onToggleShow: (provider: Provider) => void;
  /** Optional heading text (defaults to "Configure API Keys") */
  heading?: string;
  /** Whether the entire section is disabled */
  disabled?: boolean;
  /** Override for pre-calculating configured count */
  configuredCountOverride?: number;
}

/**
 * ApiKeyConfiguration organism for managing multiple provider API keys.
 *
 * Composes multiple ApiKeyInput molecules to create a complete API key
 * configuration section. Matches the wireframe design from config page.
 *
 * @example
 * ```tsx
 * <ApiKeyConfiguration
 *   items={[
 *     {
 *       provider: 'openai',
 *       label: 'OpenAI',
 *       value: 'sk-proj-...',
 *       validationStatus: 'valid',
 *       showKey: false,
 *     },
 *     {
 *       provider: 'anthropic',
 *       label: 'Anthropic',
 *       value: 'sk-ant-...',
 *       validationStatus: 'valid',
 *       showKey: false,
 *     },
 *   ]}
 *   onKeyChange={(provider, value) => handleKeyChange(provider, value)}
 *   onToggleShow={(provider) => handleToggleShow(provider)}
 * />
 * ```
 */
export const ApiKeyConfiguration = React.forwardRef<HTMLDivElement, ApiKeyConfigurationProps>(
  ({ items, onKeyChange, onToggleShow, heading, disabled = false, configuredCountOverride }, ref) => {
    const { t } = useTranslation();
    const displayHeading = heading || t('organisms.apiKeyConfiguration.heading');

    // Calculate configured keys count from items with valid status
    const configuredCount =
      typeof configuredCountOverride === 'number'
        ? configuredCountOverride
        : items.filter(item => item.validationStatus === 'valid').length;

    return (
      <div ref={ref} data-testid="api-key-configuration">
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-gray-700">
            💡 <strong>
              {configuredCount > 0
                ? t('organisms.apiKeyConfiguration.apiKeysConfigured', { count: configuredCount })
                : t('organisms.apiKeyConfiguration.apiKeyInfoBold')}
            </strong>{' '}
            {configuredCount > 0
              ? t('organisms.apiKeyConfiguration.configureMoreOrContinue')
              : t('organisms.apiKeyConfiguration.apiKeyInfoNormal')}
          </p>
        </div>

        <Heading level={3} size="lg" className="mb-6">{displayHeading}</Heading>

        <div className="space-y-6">
          {items.map((item) => (
            <ApiKeyInput
              key={item.provider}
              provider={item.provider}
              label={item.label}
              value={item.value}
              placeholder={item.placeholder}
              helperText={item.helperText}
              error={item.error}
              validationStatus={item.validationStatus}
              showKey={item.showKey}
              disabled={disabled || item.disabled}
              onChange={(value) => onKeyChange(item.provider, value)}
              onToggleShow={() => onToggleShow(item.provider)}
            />
          ))}
        </div>
      </div>
    );
  }
);

ApiKeyConfiguration.displayName = 'ApiKeyConfiguration';
