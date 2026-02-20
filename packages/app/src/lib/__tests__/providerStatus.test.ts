import { describe, expect, it } from 'vitest';
import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { getHydratedStatus, mapStatusToLabel } from '../providerStatus';

const statuses: Record<Provider, ValidationStatus> = {
  openai: 'valid',
  anthropic: 'invalid',
  google: 'validating',
  xai: 'idle',
  deepseek: 'idle',
  perplexity: 'idle',
};

describe('provider status utilities', () => {
  it('returns default statuses before hydration', () => {
    const result = getHydratedStatus(false, statuses);
    expect(result).toEqual<Record<Provider, ValidationStatus>>({
      openai: 'idle',
      anthropic: 'idle',
      google: 'idle',
      xai: 'idle',
      deepseek: 'idle',
      perplexity: 'idle',
    });
  });

  it('returns actual statuses after hydration', () => {
    const result = getHydratedStatus(true, statuses);
    expect(result).toEqual(statuses);
  });

  it('maps statuses to user-facing labels', () => {
    expect(mapStatusToLabel('valid')).toBe('Ready');
    expect(mapStatusToLabel('validating')).toBe('Validating...');
    expect(mapStatusToLabel('invalid')).toBe('Invalid API key');
    expect(mapStatusToLabel('idle')).toBe('API key required');
  });
});
