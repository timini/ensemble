/**
 * Validation utilities for API keys
 */

import type { Provider } from '@/components/molecules/ApiKeyInput';
import type { ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { initializeProviders } from '~/providers';
import { toError } from '~/lib/errors';

export interface ValidateApiKeyOptions {
  provider: Provider;
  apiKey: string;
  userMode: 'free' | 'pro';
  onStatusChange: (
    provider: Provider,
    status: ValidationStatus,
    error?: string,
  ) => void;
}

/**
 * Determines which API client mode to use for validation
 * - Uses MOCK_MODE environment variable if set (for testing/UI development)
 * - Otherwise uses the actual user mode (free/pro)
 */
function getClientMode(userMode: 'free' | 'pro'): 'mock' | 'free' | 'pro' {
  // Check if MOCK_MODE is enabled via environment variable
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    return 'mock';
  }
  // Otherwise use actual user mode
  return userMode;
}

/**
 * Validates an API key using the provider registry with the appropriate client
 * Sets status to 'idle' if key is empty
 * Sets status to 'validating' while checking
 * Sets status to 'valid' or 'invalid' based on result
 *
 * Client mode is determined by:
 * - MOCK_MODE environment variable (if set, always uses mock client)
 * - Otherwise uses client based on user's selected mode (free/pro)
 */
export async function validateApiKey({
  provider,
  apiKey,
  userMode,
  onStatusChange,
}: ValidateApiKeyOptions): Promise<void> {
  // If no API key, set to idle
  if (!apiKey || apiKey.length === 0) {
    onStatusChange(provider, 'idle');
    return;
  }

  // Set validating status
  onStatusChange(provider, 'validating');

  try {
    const providerRegistry = ProviderRegistry.getInstance();
    // Determine which client to use
    const clientMode = getClientMode(userMode);

    if (!providerRegistry.hasProvider(provider, clientMode)) {
      initializeProviders();
    }

    if (!providerRegistry.hasProvider(provider, clientMode)) {
      const msg = `Provider '${provider}' not registered for mode '${clientMode}'`;
      console.warn(`Skipping validation: ${msg}`);
      onStatusChange(provider, 'invalid', msg);
      return;
    }
    const providerInstance = providerRegistry.getProvider(provider, clientMode);
    const result = await providerInstance.validateApiKey(apiKey);

    if (result.valid) {
      onStatusChange(provider, 'valid');
    } else {
      // Pass specific error message from provider if available, or generic message
      onStatusChange(provider, 'invalid', result.error ?? 'Invalid API key');
    }
  } catch (error: unknown) {
    const normalizedError = toError(
      error,
      `Error validating ${provider} API key`,
    );
    console.error(`Error validating ${provider} API key:`, normalizedError);

    // Try to extract a user-friendly message
    let userMessage = normalizedError.message;
    if (userMessage.includes('401')) {
      userMessage = 'Invalid API key (401 Unauthorized)';
    } else if (userMessage.includes('429')) {
      userMessage = 'Rate limit exceeded (429)';
    } else if (userMessage.includes('fetch failed') || userMessage.includes('Network error')) {
      userMessage = 'Network error - check connection';
    }

    onStatusChange(provider, 'invalid', userMessage);
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
  debounceMs = 500,
) {
  return (
    provider: Provider,
    apiKey: string,
    userMode: 'free' | 'pro',
    onStatusChange: (
      provider: Provider,
      status: ValidationStatus,
      error?: string,
    ) => void,
  ) => {
    // Clear existing timeout for this provider
    const timeout = timeoutRefs.current[provider];
    if (timeout) {
      clearTimeout(timeout);
    }

    // Validate after debounce period
    timeoutRefs.current[provider] = setTimeout(() => {
      void validateFn({ provider, apiKey, userMode, onStatusChange });
    }, debounceMs);
  };
}
