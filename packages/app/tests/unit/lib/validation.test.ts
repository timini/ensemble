import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import type { Provider } from '@/components/molecules/ApiKeyInput';
import { createDebouncedValidator, validateApiKey } from '~/lib/validation';
import { initializeProviders } from '~/providers';

vi.mock('~/providers', () => ({
  initializeProviders: vi.fn(),
}));

describe('validateApiKey', () => {
  const onStatusChange = vi.fn();
  const registry = {
    hasProvider: vi.fn(),
    getProvider: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(ProviderRegistry, 'getInstance').mockReturnValue(
      registry as unknown as ProviderRegistry,
    );
  });

  it('marks provider idle when api key is empty', async () => {
    await validateApiKey({
      provider: 'openai',
      apiKey: '',
      userMode: 'free',
      onStatusChange,
    });

    expect(onStatusChange).toHaveBeenCalledWith('openai', 'idle');
  });

  it('invokes initializeProviders when provider is missing', async () => {
    registry.hasProvider.mockReturnValue(false);

    await validateApiKey({
      provider: 'openai',
      apiKey: 'sk-123',
      userMode: 'free',
      onStatusChange,
    });

    expect(initializeProviders).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenLastCalledWith('openai', 'invalid');
  });

  it('validates API keys with the resolved provider client', async () => {
    const validate = vi.fn().mockResolvedValue({ valid: true });
    registry.hasProvider.mockReturnValue(true);
    registry.getProvider.mockReturnValue({ validateApiKey: validate });

    await validateApiKey({
      provider: 'openai',
      apiKey: 'sk-123',
      userMode: 'free',
      onStatusChange,
    });

    expect(onStatusChange).toHaveBeenNthCalledWith(1, 'openai', 'validating');
    expect(onStatusChange).toHaveBeenLastCalledWith('openai', 'valid');
    expect(validate).toHaveBeenCalledWith('sk-123');
  });

  it('handles provider validation errors gracefully', async () => {
    const validate = vi.fn().mockRejectedValue(new Error('boom'));
    registry.hasProvider.mockReturnValue(true);
    registry.getProvider.mockReturnValue({ validateApiKey: validate });

    await validateApiKey({
      provider: 'openai',
      apiKey: 'sk-123',
      userMode: 'free',
      onStatusChange,
    });

    expect(onStatusChange).toHaveBeenLastCalledWith('openai', 'invalid');
  });
});

describe('createDebouncedValidator', () => {
  const timeoutRefs = {
    current: {
      openai: null,
      anthropic: null,
      google: null,
      xai: null,
    } as Record<Provider, NodeJS.Timeout | null>,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    timeoutRefs.current = {
      openai: null,
      anthropic: null,
      google: null,
      xai: null,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces validation calls per provider', () => {
    const validateFn = vi.fn().mockResolvedValue(undefined);
    const debounced = createDebouncedValidator(timeoutRefs, validateFn, 200);
    const handler = vi.fn();

    debounced('openai', 'first', 'free', handler);
    debounced('openai', 'second', 'free', handler);

    vi.advanceTimersByTime(199);
    expect(validateFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(validateFn).toHaveBeenCalledTimes(1);
    expect(validateFn).toHaveBeenCalledWith({
      provider: 'openai',
      apiKey: 'second',
      userMode: 'free',
      onStatusChange: handler,
    });
  });
});
