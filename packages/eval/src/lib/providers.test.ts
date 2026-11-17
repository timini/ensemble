import { afterEach, describe, expect, it } from 'vitest';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
import { endpointConfigs, getApiKeyForProvider, registerProviders } from './providers.js';
import { endpointsOf, parseModelSpecs } from './modelSpecs.js';

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

describe('providers', () => {
  it('reads cloud keys from the environment', () => {
    process.env.OPENAI_API_KEY = '  sk-test  ';
    expect(getApiKeyForProvider('openai')).toBe('sk-test');
    delete process.env.OPENAI_API_KEY;
    expect(getApiKeyForProvider('openai')).toBeNull();
  });

  it('builds endpoint configs with keys from env and an empty key for local servers', () => {
    process.env.OPENROUTER_API_KEY = 'or-key';
    delete process.env.OLLAMA_API_KEY;
    const endpoints = endpointsOf(parseModelSpecs(['openrouter:qwen/qwen3-14b,ollama:llama3.2']));
    expect(endpointConfigs(endpoints)).toEqual([
      { id: 'openrouter', baseURL: 'https://openrouter.ai/api/v1', apiKey: 'or-key' },
      { id: 'ollama', baseURL: 'http://localhost:11434/v1', apiKey: '' },
    ]);
  });

  it('registers openai-compatible for a local server with no key in free mode', () => {
    delete process.env.OLLAMA_API_KEY;
    const specs = parseModelSpecs(['ollama:llama3.2']);
    const registry = new ProviderRegistry();
    registerProviders(registry, ['openai-compatible'], 'free', endpointsOf(specs));
    expect(registry.getProvider('openai-compatible', 'free')).toBeDefined();
  });

  it('refuses a hosted endpoint without its key in free mode', () => {
    delete process.env.OPENROUTER_API_KEY;
    const specs = parseModelSpecs(['openrouter:qwen/qwen3-14b']);
    expect(() =>
      registerProviders(new ProviderRegistry(), ['openai-compatible'], 'free', endpointsOf(specs)),
    ).toThrow(/OPENROUTER_API_KEY/);
  });

  it('refuses openai-compatible without any endpoint', () => {
    expect(() => registerProviders(new ProviderRegistry(), ['openai-compatible'], 'free')).toThrow(
      /endpoint/,
    );
  });

  it('registers mock clients without keys', () => {
    const registry = new ProviderRegistry();
    registerProviders(registry, ['openai', 'openai-compatible'], 'mock');
    expect(registry.getProvider('openai', 'mock')).toBeDefined();
  });

  it('still requires a cloud key in free mode', () => {
    delete process.env.XAI_API_KEY;
    expect(() => registerProviders(new ProviderRegistry(), ['xai'], 'free')).toThrow(/XAI_API_KEY/);
  });
});
