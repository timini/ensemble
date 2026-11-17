import { describe, it, expect } from 'vitest';
import {
  ENDPOINT_PRESETS,
  getEndpointPreset,
  nextEndpointId,
  parseEndpointModelId,
  presetIdOfEndpoint,
  toEndpointModelId,
} from './endpointPresets';

describe('endpoint presets', () => {
  it('lists the local servers, hosted routers and Custom with their base URLs', () => {
    const byId = Object.fromEntries(ENDPOINT_PRESETS.map((p) => [p.id, p.baseURL]));
    expect(byId).toEqual({
      ollama: 'http://localhost:11434/v1',
      lmstudio: 'http://localhost:1234/v1',
      llamacpp: 'http://localhost:8080/v1',
      vllm: 'http://localhost:8000/v1',
      openrouter: 'https://openrouter.ai/api/v1',
      groq: 'https://api.groq.com/openai/v1',
      together: 'https://api.together.ai/v1',
      custom: '',
    });
  });

  it('marks local servers as local and keyless, hosted ones as needing a key', () => {
    expect(getEndpointPreset('ollama')).toMatchObject({ local: true, requiresKey: false });
    expect(getEndpointPreset('openrouter')).toMatchObject({ local: false, requiresKey: true });
    expect(getEndpointPreset('custom')).toMatchObject({ local: false, requiresKey: false });
  });

  it('falls back to Custom for an unknown preset id', () => {
    expect(getEndpointPreset('nope').id).toBe('custom');
  });
});

describe('endpoint ids', () => {
  it('uses the preset id first, then numbered ids', () => {
    expect(nextEndpointId('ollama', [])).toBe('ollama');
    expect(nextEndpointId('ollama', ['ollama'])).toBe('ollama-2');
    expect(nextEndpointId('ollama', ['ollama', 'ollama-2'])).toBe('ollama-3');
    expect(nextEndpointId('custom', ['ollama'])).toBe('custom');
  });

  it('reads the preset back from an endpoint id', () => {
    expect(presetIdOfEndpoint('ollama')).toBe('ollama');
    expect(presetIdOfEndpoint('groq-3')).toBe('groq');
    expect(presetIdOfEndpoint('mystery')).toBe('custom');
  });
});

describe('endpoint model ids', () => {
  it('qualifies a model id with its endpoint', () => {
    expect(toEndpointModelId('ollama', 'llama3.2:3b')).toBe('ollama/llama3.2:3b');
  });

  it('splits on the first slash so router ids with slashes survive', () => {
    expect(parseEndpointModelId('openrouter/meta-llama/llama-3.1-8b-instruct')).toEqual({
      endpointId: 'openrouter',
      modelId: 'meta-llama/llama-3.1-8b-instruct',
    });
  });

  it('returns null for an id without an endpoint', () => {
    expect(parseEndpointModelId('llama3')).toBeNull();
    expect(parseEndpointModelId('/llama3')).toBeNull();
    expect(parseEndpointModelId('ollama/')).toBeNull();
  });
});
