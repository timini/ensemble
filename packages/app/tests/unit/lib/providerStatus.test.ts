import { describe, expect, it } from 'vitest';
import type { Provider } from '@/components/molecules/ApiKeyInput';
import { createProviderStatusLabels } from '~/lib/providerStatus';

const baseStatuses: Record<Provider, 'idle' | 'invalid' | 'valid' | 'validating'> = {
  openai: 'invalid',
  anthropic: 'valid',
  google: 'validating',
  xai: 'idle',
  deepseek: 'idle',
  perplexity: 'idle',
};

describe('createProviderStatusLabels', () => {
  it('returns ready labels for pro mode regardless of hydration', () => {
    const labels = createProviderStatusLabels({
      mode: 'pro',
      statuses: baseStatuses,
      hasHydrated: false,
    });

    expect(labels).toEqual({
      openai: 'Ready',
      anthropic: 'Ready',
      google: 'Ready',
      xai: 'Ready',
      deepseek: 'Ready',
      perplexity: 'Ready',
    });
  });

  it('falls back to idle labels until hydration completes', () => {
    const labels = createProviderStatusLabels({
      mode: 'free',
      statuses: baseStatuses,
      hasHydrated: false,
    });

    expect(labels.openai).toBe('API key required');
    expect(labels.google).toBe('API key required');
  });

  it('uses real validation state after hydration', () => {
    const labels = createProviderStatusLabels({
      mode: 'free',
      statuses: baseStatuses,
      hasHydrated: true,
    });

    expect(labels.openai).toBe('Invalid API key');
    expect(labels.anthropic).toBe('Ready');
    expect(labels.google).toBe('Validating...');
    expect(labels.xai).toBe('API key required');
  });
});
