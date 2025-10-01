/**
 * Validation utilities for API keys
 */

import type { Provider } from '@/components/molecules/ApiKeyInput';
import type { ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { ProviderRegistry } from '~/providers/ProviderRegistry';

export interface ValidateApiKeyOptions {
  provider: Provider;
  apiKey: string;
  mode: string;
  onStatusChange: (provider: Provider, status: ValidationStatus) => void;
}

/**
 * Validates an API key using the provider registry
 * Sets status to 'idle' if key is empty
 * Sets status to 'validating' while checking
 * Sets status to 'valid' or 'invalid' based on result
 * Only validates in 'free' mode
 */
export async function validateApiKey({
  provider,
  apiKey,
  mode,
  onStatusChange,
}: ValidateApiKeyOptions): Promise<void> {
  // If no API key, set to idle
  if (!apiKey || apiKey.length === 0) {
    onStatusChange(provider, 'idle');
    return;
  }

  // Only validate in free mode
  if (mode !== 'free') {
    return;
  }

  // Set validating status
  onStatusChange(provider, 'validating');

  try {
    const providerRegistry = ProviderRegistry.getInstance();
    const providerInstance = providerRegistry.getProvider(provider, 'mock');
    const result = await providerInstance.validateApiKey(apiKey);
    onStatusChange(provider, result.valid ? 'valid' : 'invalid');
  } catch (error) {
    console.error(`Error validating ${provider} API key:`, error);
    onStatusChange(provider, 'invalid');
  }
}

/**
 * Creates a debounced validation handler
 * Cancels previous validation if user continues typing
 * Validates after 500ms of inactivity
 */
export function createDebouncedValidator(
  timeoutRefs: React.MutableRefObject<Record<Provider, NodeJS.Timeout | null>>,
  validateFn: (options: ValidateApiKeyOptions) => Promise<void>,
  debounceMs = 500
) {
  return (provider: Provider, apiKey: string, mode: string, onStatusChange: (provider: Provider, status: ValidationStatus) => void) => {
    // Clear existing timeout for this provider
    const timeout = timeoutRefs.current[provider];
    if (timeout) {
      clearTimeout(timeout);
    }

    // Validate after debounce period
    timeoutRefs.current[provider] = setTimeout(() => {
      void validateFn({ provider, apiKey, mode, onStatusChange });
    }, debounceMs);
  };
}
