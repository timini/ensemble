import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_OLLAMA_EMBEDDING_MODEL,
  OLLAMA_DEFAULT_URL,
  detectOllama,
  isEmbeddingModelId,
  isLocalNetworkBlockLikely,
  ollamaPullCommand,
  pickEmbeddingModel,
} from './localServers';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('isEmbeddingModelId', () => {
  it('recognises known embedding models with or without a tag', () => {
    expect(isEmbeddingModelId('nomic-embed-text')).toBe(true);
    expect(isEmbeddingModelId('nomic-embed-text:latest')).toBe(true);
    expect(isEmbeddingModelId('embeddinggemma:300m')).toBe(true);
    expect(isEmbeddingModelId('qwen3-embedding:0.6b')).toBe(true);
    expect(isEmbeddingModelId('all-minilm')).toBe(true);
    expect(isEmbeddingModelId('bge-m3')).toBe(true);
    expect(isEmbeddingModelId('text-embedding-nomic-embed-text-v1.5')).toBe(true);
  });

  it('does not treat chat models as embedding models', () => {
    expect(isEmbeddingModelId('llama3.2:3b')).toBe(false);
    expect(isEmbeddingModelId('qwen3:4b')).toBe(false);
    expect(isEmbeddingModelId('gemma3:4b')).toBe(false);
  });
});

describe('pickEmbeddingModel', () => {
  it('keeps the preferred model when the server has it', () => {
    expect(pickEmbeddingModel(['llama3.2:3b', 'nomic-embed-text:latest', 'all-minilm'], 'nomic-embed-text')).toBe(
      'nomic-embed-text',
    );
  });

  it('picks the best known embedding model when the preferred one is missing', () => {
    expect(pickEmbeddingModel(['llama3.2:3b', 'all-minilm:latest', 'embeddinggemma:latest'], 'nomic-embed-text')).toBe(
      'embeddinggemma:latest',
    );
  });

  it('falls back to any model whose id says embed', () => {
    expect(pickEmbeddingModel(['tiny-alpha', 'tiny-embed'])).toBe('tiny-embed');
  });

  it('returns undefined when the server has no embedding model', () => {
    expect(pickEmbeddingModel(['llama3.2:3b', 'qwen3:4b'], 'nomic-embed-text')).toBeUndefined();
  });
});

describe('ollamaPullCommand', () => {
  it('gives the exact command for the default embedding model', () => {
    expect(DEFAULT_OLLAMA_EMBEDDING_MODEL).toBe('nomic-embed-text');
    expect(ollamaPullCommand()).toBe('ollama pull nomic-embed-text');
    expect(ollamaPullCommand('embeddinggemma')).toBe('ollama pull embeddinggemma');
  });
});

describe('detectOllama', () => {
  it('lists installed models from /api/tags and splits chat and embedding models', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe('http://localhost:11434/api/tags');
      return jsonResponse({
        models: [{ name: 'llama3.2:3b' }, { name: 'nomic-embed-text:latest' }, { model: 'qwen3:4b' }],
      });
    });

    const result = await detectOllama({ fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result).toEqual({
      found: true,
      url: OLLAMA_DEFAULT_URL,
      baseURL: 'http://localhost:11434/v1',
      models: ['llama3.2:3b', 'nomic-embed-text:latest', 'qwen3:4b'],
      chatModels: ['llama3.2:3b', 'qwen3:4b'],
      embeddingModel: 'nomic-embed-text:latest',
    });
  });

  it('falls back to /v1/models when /api/tags is not served', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith('/api/tags')
        ? jsonResponse({ error: 'not found' }, 404)
        : jsonResponse({ data: [{ id: 'tiny-alpha' }, { id: 'tiny-embed' }] }),
    );

    const result = await detectOllama({ url: 'http://localhost:11499/', fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(result).toMatchObject({
      found: true,
      url: 'http://localhost:11499',
      baseURL: 'http://localhost:11499/v1',
      chatModels: ['tiny-alpha'],
      embeddingModel: 'tiny-embed',
    });
  });

  it('reports not found, without throwing, when nothing answers', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(detectOllama({ fetchImpl: fetchImpl as unknown as typeof fetch })).resolves.toEqual({ found: false });
  });

  it('gives up after the timeout', async () => {
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const started = Date.now();
    const result = await detectOllama({ timeoutMs: 30, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toEqual({ found: false });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('reports not found when the answer is not a model list', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>hello</html>', { status: 200 }));
    await expect(detectOllama({ fetchImpl: fetchImpl as unknown as typeof fetch })).resolves.toEqual({ found: false });
  });
});

describe('isLocalNetworkBlockLikely', () => {
  it('is true for a loopback server called from a hosted page', () => {
    expect(isLocalNetworkBlockLikely('http://localhost:11434/v1', 'https://ensemble.example.app')).toBe(true);
    expect(isLocalNetworkBlockLikely('http://127.0.0.1:1234/v1', 'https://ensemble.example.app')).toBe(true);
  });

  it('is false when the page itself runs on this machine', () => {
    expect(isLocalNetworkBlockLikely('http://localhost:11434/v1', 'http://localhost:3000')).toBe(false);
    expect(isLocalNetworkBlockLikely('http://localhost:11434/v1', 'http://127.0.0.1:3000')).toBe(false);
  });

  it('is false for a hosted server', () => {
    expect(isLocalNetworkBlockLikely('https://openrouter.ai/api/v1', 'https://ensemble.example.app')).toBe(false);
  });
});
