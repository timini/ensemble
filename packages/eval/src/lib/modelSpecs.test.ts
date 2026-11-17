import { describe, expect, it } from 'vitest';
import {
  endpointsOf,
  explodeList,
  formatModelSpec,
  parseModelSpec,
  parseModelSpecs,
  sameModel,
} from './modelSpecs.js';

describe('modelSpecs helpers', () => {
  it('explodes comma-separated and repeated values', () => {
    const values = explodeList([
      'openai:gpt-4o,anthropic:claude-3-5-sonnet-latest',
      'google:gemini-2.5-pro',
    ]);
    expect(values).toEqual([
      'openai:gpt-4o',
      'anthropic:claude-3-5-sonnet-latest',
      'google:gemini-2.5-pro',
    ]);
  });

  it('parses a valid provider:model spec', () => {
    expect(parseModelSpec('xai:grok-4')).toEqual({
      provider: 'xai',
      model: 'grok-4',
    });
  });

  it('throws on invalid provider', () => {
    expect(() => parseModelSpec('foo:model-1')).toThrow(/Invalid provider/);
  });

  it('throws when no model specs were provided', () => {
    expect(() => parseModelSpecs([])).toThrow(/At least one model/);
  });

  it('parses an OpenRouter spec into an openai-compatible model', () => {
    expect(parseModelSpec('openrouter:qwen/qwen3-14b')).toEqual({
      provider: 'openai-compatible',
      model: 'openrouter/qwen/qwen3-14b',
      endpoint: {
        id: 'openrouter',
        baseURL: 'https://openrouter.ai/api/v1',
        apiKeyEnv: 'OPENROUTER_API_KEY',
        requiresKey: true,
      },
    });
  });

  it('parses local server specs with no key required', () => {
    const spec = parseModelSpec('ollama:llama3.2:3b');
    expect(spec.provider).toBe('openai-compatible');
    expect(spec.model).toBe('ollama/llama3.2:3b');
    expect(spec.endpoint).toEqual({
      id: 'ollama',
      baseURL: 'http://localhost:11434/v1',
      apiKeyEnv: 'OLLAMA_API_KEY',
      requiresKey: false,
    });
    expect(parseModelSpec('lmstudio:qwen3-8b').endpoint?.baseURL).toBe('http://localhost:1234/v1');
    expect(parseModelSpec('groq:llama-3.1-8b-instant').endpoint?.apiKeyEnv).toBe('GROQ_API_KEY');
  });

  it('takes a base URL override from <PRESET>_BASE_URL', () => {
    const previous = process.env.OLLAMA_BASE_URL;
    process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:9999/v1';
    try {
      expect(parseModelSpec('ollama:llama3.2').endpoint?.baseURL).toBe('http://127.0.0.1:9999/v1');
    } finally {
      if (previous === undefined) delete process.env.OLLAMA_BASE_URL;
      else process.env.OLLAMA_BASE_URL = previous;
    }
  });

  it('parses compat:<baseURL>#<model> with a stable endpoint id', () => {
    const spec = parseModelSpec('compat:http://localhost:8081/v1#my-model');
    expect(spec.provider).toBe('openai-compatible');
    expect(spec.endpoint?.baseURL).toBe('http://localhost:8081/v1');
    expect(spec.endpoint?.apiKeyEnv).toBe('OPENAI_COMPATIBLE_API_KEY');
    expect(spec.endpoint?.requiresKey).toBe(false);
    expect(spec.endpoint?.id).toMatch(/^compat-[a-z0-9]+$/);
    expect(spec.model).toBe(`${spec.endpoint?.id}/my-model`);
    expect(parseModelSpec('compat:http://localhost:8081/v1#other').endpoint?.id).toBe(spec.endpoint?.id);
    expect(parseModelSpec('compat:http://localhost:8082/v1#other').endpoint?.id).not.toBe(spec.endpoint?.id);
  });

  it('rejects malformed compat specs', () => {
    expect(() => parseModelSpec('compat:http://localhost:8081/v1')).toThrow(/compat:<baseURL>#<model>/);
    expect(() => parseModelSpec('compat:not a url#m')).toThrow(/base URL/);
  });

  it('accepts openai-compatible:<endpoint>/<model> for presets', () => {
    expect(parseModelSpec('openai-compatible:openrouter/meta-llama/llama-3.1-8b-instruct')).toEqual(
      parseModelSpec('openrouter:meta-llama/llama-3.1-8b-instruct'),
    );
  });

  it('formats specs back to the form they were written in', () => {
    expect(formatModelSpec(parseModelSpec('openai:gpt-4o'))).toBe('openai:gpt-4o');
    expect(formatModelSpec(parseModelSpec('openrouter:qwen/qwen3-14b'))).toBe('openrouter:qwen/qwen3-14b');
    expect(formatModelSpec(parseModelSpec('compat:http://localhost:8081/v1#m'))).toBe(
      'compat:http://localhost:8081/v1#m',
    );
  });

  it('lists each endpoint once', () => {
    const specs = parseModelSpecs(['ollama:a,ollama:b,openrouter:c/d,openai:gpt-4o']);
    expect(endpointsOf(specs).map((e) => e.id)).toEqual(['ollama', 'openrouter']);
  });

  it('compares specs by provider and model', () => {
    expect(sameModel(parseModelSpec('ollama:a'), parseModelSpec('ollama:a'))).toBe(true);
    expect(sameModel(parseModelSpec('ollama:a'), parseModelSpec('openrouter:a'))).toBe(false);
  });
});
