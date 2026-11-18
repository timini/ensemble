import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FreeAnthropicClient } from './FreeAnthropicClient.js';
import { acceptsSamplingParams, supportsStructuredOutputs } from './anthropicModelRules.js';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    messagesCreate: vi.fn(),
    modelsList: vi.fn(),
  },
}));

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  const MockAnthropic = class {
    models = { list: mocks.modelsList };
    messages = { create: mocks.messagesCreate };
  };
  (MockAnthropic as unknown as Record<string, unknown>).APIError = APIError;
  return { default: MockAnthropic };
});

const schema = {
  name: 'mcq_answer',
  schema: {
    type: 'object',
    properties: { answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] } },
    required: ['answer'],
    additionalProperties: false,
  },
};

const streamOf = (events: unknown[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const event of events) yield event;
  },
});

const lastRequest = () => mocks.messagesCreate.mock.calls.at(-1)?.[0] as Record<string, unknown>;

describe('anthropicModelRules', () => {
  it.each([
    'claude-opus-5-5',
    'claude-sonnet-5-5',
    'claude-haiku-5-5',
    'claude-opus-5',
    'claude-sonnet-5',
    'claude-fable-5-2',
    'claude-opus-4-8',
    'claude-opus-4-7',
    'claude-some-future-model',
  ])('does not send sampling params to %s', (model) => {
    expect(acceptsSamplingParams(model)).toBe(false);
  });

  it.each([
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5',
    'claude-opus-4-1-20250805',
    'claude-sonnet-4-20250514',
    'claude-3-5-haiku-20241022',
  ])('still sends sampling params to %s', (model) => {
    expect(acceptsSamplingParams(model)).toBe(true);
  });

  it.each([
    'claude-opus-5-5',
    'claude-sonnet-5-5',
    'claude-haiku-5-5',
    'claude-opus-4-6',
    'claude-haiku-4-5',
    'claude-opus-4-1',
    'claude-some-future-model',
  ])('uses structured outputs for %s', (model) => {
    expect(supportsStructuredOutputs(model)).toBe(true);
  });

  it.each(['claude-3-haiku-20240307', 'claude-sonnet-4-20250514', 'claude-opus-4-0'])(
    'falls back to a forced tool call for %s',
    (model) => {
      expect(supportsStructuredOutputs(model)).toBe(false);
    },
  );
});

describe('FreeAnthropicClient', () => {
  beforeEach(() => {
    mocks.messagesCreate.mockReset();
    mocks.modelsList.mockReset();
  });

  describe('generateStructured', () => {
    it('uses output_config.format with no tool_choice or temperature on Claude 5.5', async () => {
      mocks.messagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"answer":"B"}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      const result = await client.generateStructured<{ answer: string }>(
        'Pick one',
        'claude-sonnet-5-5',
        schema,
        { temperature: 0 },
      );

      expect(result.parsed).toEqual({ answer: 'B' });
      expect(result.raw).toBe('{"answer":"B"}');
      expect(result.tokenCount).toBe(15);
      expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 });

      const request = lastRequest();
      expect(request).toMatchObject({
        model: 'claude-sonnet-5-5',
        messages: [{ role: 'user', content: 'Pick one' }],
        output_config: { format: { type: 'json_schema', schema: schema.schema } },
      });
      expect(request).not.toHaveProperty('tool_choice');
      expect(request).not.toHaveProperty('tools');
      expect(request).not.toHaveProperty('temperature');
      // Thinking shares the max_tokens budget on 5.5 models; 1024 is too small.
      expect(request.max_tokens as number).toBeGreaterThanOrEqual(4096);
    });

    it('keeps temperature for older models that accept it', async () => {
      mocks.messagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"answer":"A"}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 1, output_tokens: 1 },
      });

      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      await client.generateStructured('Pick one', 'claude-haiku-4-5', schema, { temperature: 0 });

      expect(lastRequest()).toMatchObject({ temperature: 0 });
    });

    it('uses a forced tool call for legacy models without structured outputs', async () => {
      mocks.messagesCreate.mockResolvedValueOnce({
        content: [{ type: 'tool_use', name: 'mcq_answer', input: { answer: 'C' } }],
        stop_reason: 'tool_use',
        usage: { input_tokens: 2, output_tokens: 3 },
      });

      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      const result = await client.generateStructured<{ answer: string }>(
        'Pick one',
        'claude-3-haiku-20240307',
        schema,
      );

      expect(result.parsed).toEqual({ answer: 'C' });
      expect(result.usage).toEqual({ inputTokens: 2, outputTokens: 3 });
      const request = lastRequest();
      expect(request).toMatchObject({
        tool_choice: { type: 'tool', name: 'mcq_answer' },
        tools: [expect.objectContaining({ name: 'mcq_answer', input_schema: schema.schema })],
      });
      expect(request).not.toHaveProperty('output_config');
    });

    it('throws a clear error on a refusal', async () => {
      mocks.messagesCreate.mockResolvedValueOnce({
        content: [],
        stop_reason: 'refusal',
        usage: { input_tokens: 1, output_tokens: 0 },
      });

      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      await expect(
        client.generateStructured('Pick one', 'claude-opus-5-5', schema),
      ).rejects.toThrow(/refus/i);
    });

    it('throws when the output was cut off by max_tokens', async () => {
      mocks.messagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"ans' }],
        stop_reason: 'max_tokens',
        usage: { input_tokens: 1, output_tokens: 1 },
      });

      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      await expect(
        client.generateStructured('Pick one', 'claude-opus-5-5', schema),
      ).rejects.toThrow(/max_tokens/);
    });
  });

  describe('streamResponse', () => {
    it('omits temperature for Claude 5.5 and allows room for thinking', async () => {
      mocks.messagesCreate.mockResolvedValueOnce(
        streamOf([
          { type: 'message_start', message: { usage: { input_tokens: 5, output_tokens: 1 } } },
          { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } },
          { type: 'message_delta', usage: { output_tokens: 2 } },
          { type: 'message_delta', usage: { output_tokens: 3 } },
          { type: 'message_stop' },
        ]),
      );

      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      const onChunk = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();
      await client.streamResponse('Hello', 'claude-opus-5-5', onChunk, onComplete, onError, {
        temperature: 0.7,
      });

      expect(onError).not.toHaveBeenCalled();
      expect(onChunk).toHaveBeenCalledWith('Hi');
      // output_tokens in message_delta is a running total, so the last one counts.
      expect(onComplete).toHaveBeenCalledWith('Hi', expect.any(Number), 8, {
        inputTokens: 5,
        outputTokens: 3,
      });
      const request = lastRequest();
      expect(request).toMatchObject({ model: 'claude-opus-5-5', stream: true });
      expect(request).not.toHaveProperty('temperature');
      expect(request.max_tokens as number).toBeGreaterThanOrEqual(16000);
    });

    it('passes temperature to models that accept it', async () => {
      mocks.messagesCreate.mockResolvedValueOnce(streamOf([{ type: 'message_stop' }]));

      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant');
      await client.streamResponse('Hello', 'claude-sonnet-4-6', vi.fn(), vi.fn(), vi.fn(), {
        temperature: 0.7,
      });

      expect(lastRequest()).toMatchObject({ temperature: 0.7 });
    });
  });

  describe('stream errors', () => {
    beforeEach(() => mocks.messagesCreate.mockReset());

    it.each([
      [401, 'invalid_key'],
      [429, 'rate_limited'],
      [529, 'provider_unavailable'],
    ])('classifies status %i as %s', async (status, kind) => {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const APIError = (Anthropic as unknown as { APIError: new (s: number, m: string) => Error }).APIError;
      mocks.messagesCreate.mockRejectedValueOnce(new APIError(status, `${status} failed`));

      const client = new FreeAnthropicClient('anthropic', () => 'sk-ant-test');
      const onError = vi.fn();
      await client.streamResponse('p', 'claude-opus-5-5', vi.fn(), vi.fn(), onError);

      expect(onError.mock.calls[0][0]).toMatchObject({ kind, status, provider: 'anthropic' });
      expect(onError.mock.calls[0][0].message).toContain('Anthropic API error');
    });
  });
});
