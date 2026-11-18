import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AIProvider } from '../../types';
import { FreeOpenAIClient } from '../openai/FreeOpenAIClient';
import { FreeAnthropicClient } from '../anthropic/FreeAnthropicClient';
import { FreeGoogleClient } from '../google/FreeGoogleClient';
import { FreeXAIClient } from '../xai/FreeXAIClient';
import { FreeDeepSeekClient } from '../deepseek/FreeDeepSeekClient';

/**
 * Stop must cancel the network request of the direct cloud clients, not only
 * drop their callbacks. Each SDK call here hangs until the signal it was
 * given aborts, so a client that does not pass the signal never sees it.
 */
const { mocks } = vi.hoisted(() => ({
  mocks: {
    openAiCreate: vi.fn(),
    anthropicCreate: vi.fn(),
    googleGenerate: vi.fn(),
    googleStream: vi.fn(),
  },
}));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mocks.openAiCreate } };
  },
}));

vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = class {
    messages = { create: mocks.anthropicCreate };
  };
  (MockAnthropic as unknown as Record<string, unknown>).APIError = class extends Error {};
  return { default: MockAnthropic };
});

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mocks.googleGenerate, generateContentStream: mocks.googleStream };
    }
  },
}));

/** An SDK call that settles only when the signal in its request options aborts. */
function hangUntilAborted(_body: unknown, requestOptions?: { signal?: AbortSignal }) {
  return new Promise((_, reject) => {
    requestOptions?.signal?.addEventListener('abort', () =>
      reject(new DOMException('The operation was aborted.', 'AbortError')),
    );
  });
}

const schema = {
  name: 'answer',
  schema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] },
};

interface Case {
  name: string;
  client: () => AIProvider;
  sdk: () => ReturnType<typeof vi.fn>;
  streamSdk?: () => ReturnType<typeof vi.fn>;
  model: string;
}

const cases: Case[] = [
  { name: 'OpenAI', client: () => new FreeOpenAIClient('openai', () => 'k'), sdk: () => mocks.openAiCreate, model: 'gpt-4o' },
  { name: 'Anthropic', client: () => new FreeAnthropicClient('anthropic', () => 'k'), sdk: () => mocks.anthropicCreate, model: 'claude-sonnet-5-5' },
  {
    name: 'Google',
    client: () => new FreeGoogleClient('google', () => 'k'),
    sdk: () => mocks.googleGenerate,
    streamSdk: () => mocks.googleStream,
    model: 'gemini-3-flash',
  },
  { name: 'xAI', client: () => new FreeXAIClient('xai', () => 'k'), sdk: () => mocks.openAiCreate, model: 'grok-4' },
  { name: 'DeepSeek', client: () => new FreeDeepSeekClient('deepseek', () => 'k'), sdk: () => mocks.openAiCreate, model: 'deepseek-chat' },
];

const signalOf = (fn: ReturnType<typeof vi.fn>) =>
  (fn.mock.calls.at(-1)?.[1] as { signal?: AbortSignal } | undefined)?.signal;

afterEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset();
  vi.unstubAllGlobals();
});

describe.each(cases)('$name cancellation', ({ client, sdk, streamSdk, model }) => {
  it('aborts the streaming request when the caller stops', async () => {
    const stream = streamSdk?.() ?? sdk();
    stream.mockImplementation(hangUntilAborted);
    const controller = new AbortController();
    const onError = vi.fn();
    const done = client().streamResponse('Hi', model, vi.fn(), vi.fn(), onError, { signal: controller.signal });
    await vi.waitFor(() => expect(stream).toHaveBeenCalled());
    controller.abort();
    await done;

    expect(signalOf(stream)?.aborted).toBe(true);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ kind: 'cancelled' });
  });

  it('aborts the structured request when the caller stops', async () => {
    sdk().mockImplementation(hangUntilAborted);
    const controller = new AbortController();
    const done = client().generateStructured('Hi', model, schema, { signal: controller.signal });
    await vi.waitFor(() => expect(sdk()).toHaveBeenCalled());
    controller.abort();

    await expect(done).rejects.toMatchObject({ kind: 'cancelled' });
    expect(signalOf(sdk())?.aborted).toBe(true);
  });
});

describe.each([
  { name: 'OpenAI', client: () => new FreeOpenAIClient('openai', () => 'k') },
  { name: 'Google', client: () => new FreeGoogleClient('google', () => 'k') },
])('$name embeddings cancellation', ({ client }) => {
  it('passes the caller signal to the embeddings request', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => hangUntilAborted(null, init as { signal?: AbortSignal }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const done = client().generateEmbeddings('Hi', { signal: controller.signal });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    controller.abort();

    await expect(done).rejects.toThrow();
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true);
  });
});
