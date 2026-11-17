import { describe, expect, it } from 'vitest';
import {
  ProviderError,
  classifyProviderError,
  isProviderError,
  parseRetryAfter,
} from './providerError';

function statusError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return Object.assign(new Error(message), { status, ...extra });
}

describe('classifyProviderError', () => {
  it.each([
    [401, 'invalid_key'],
    [403, 'invalid_key'],
    [429, 'rate_limited'],
    [408, 'timeout'],
    [500, 'provider_unavailable'],
    [502, 'provider_unavailable'],
    [503, 'provider_unavailable'],
    [529, 'provider_unavailable'],
    [400, 'other'],
    [404, 'other'],
  ])('maps HTTP status %i to %s', (status, kind) => {
    const result = classifyProviderError(statusError(status, `${status} failed`));
    expect(result.kind).toBe(kind);
    expect(result.status).toBe(status);
  });

  it('reads the status from an axios-style response', () => {
    const error = Object.assign(new Error('Request failed'), { response: { status: 401 } });
    expect(classifyProviderError(error).kind).toBe('invalid_key');
  });

  it('reads the status from a message that starts with it', () => {
    expect(classifyProviderError(new Error('429 Too many requests')).kind).toBe('rate_limited');
  });

  it('reads a bracketed status from a Google SDK message', () => {
    const error = new Error(
      '[GoogleGenerativeAI Error]: Error fetching from https://x: [503 Service Unavailable] overloaded',
    );
    expect(classifyProviderError(error).kind).toBe('provider_unavailable');
  });

  it('treats a missing API key as missing_key, not a rejected key', () => {
    const error = new Error('Missing API key for openai. Configure an API key on the configuration page.');
    expect(classifyProviderError(error).kind).toBe('missing_key');
  });

  it.each(['Failed to fetch', 'fetch failed', 'NetworkError when attempting to fetch resource.', 'connect ECONNREFUSED 127.0.0.1:443'])(
    'treats the network failure "%s" as provider_unavailable',
    (message) => {
      expect(classifyProviderError(new TypeError(message)).kind).toBe('provider_unavailable');
    },
  );

  it('treats SDK connection errors as provider_unavailable', () => {
    const error = Object.assign(new Error('Connection error.'), { name: 'APIConnectionError' });
    expect(classifyProviderError(error).kind).toBe('provider_unavailable');
  });

  it('treats SDK connection timeouts as timeout', () => {
    const error = Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' });
    expect(classifyProviderError(error).kind).toBe('timeout');
  });

  it('falls back to other', () => {
    expect(classifyProviderError(new Error('Something odd')).kind).toBe('other');
    expect(classifyProviderError('plain string').kind).toBe('other');
  });

  it('reads retry-after from a Headers object', () => {
    const error = statusError(429, 'rate limited', {
      headers: new Headers({ 'retry-after': '30' }),
    });
    expect(classifyProviderError(error).retryAfterSeconds).toBe(30);
  });

  it('reads retry-after-ms from a plain header record', () => {
    const error = statusError(429, 'rate limited', { headers: { 'retry-after-ms': '1500' } });
    expect(classifyProviderError(error).retryAfterSeconds).toBe(2);
  });

  it('reads the retry delay from Google error details', () => {
    const error = statusError(429, 'quota', {
      errorDetails: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '17s' }],
    });
    expect(classifyProviderError(error).retryAfterSeconds).toBe(17);
  });

  it('only keeps retry-after for rate limits', () => {
    const error = statusError(503, 'down', { headers: { 'retry-after': '30' } });
    expect(classifyProviderError(error).retryAfterSeconds).toBeUndefined();
  });

  it('prefixes the label and redacts keys in the message', () => {
    const error = statusError(401, 'Incorrect API key provided: sk-proj-abcdefghijklmnop');
    const result = classifyProviderError(error, { provider: 'openai', label: 'OpenAI API error' });
    expect(result.message).toBe('OpenAI API error: Incorrect API key provided: [REDACTED]');
    expect(result.provider).toBe('openai');
  });

  it('returns an existing ProviderError unchanged', () => {
    const original = new ProviderError('timed out', 'timeout');
    expect(classifyProviderError(original, { label: 'X' })).toBe(original);
  });
});

describe('isProviderError', () => {
  it('recognises instances and plain look-alikes', () => {
    expect(isProviderError(new ProviderError('x', 'other'))).toBe(true);
    expect(isProviderError({ name: 'ProviderError', kind: 'timeout', message: 'x' })).toBe(true);
    expect(isProviderError(new Error('x'))).toBe(false);
    expect(isProviderError(null)).toBe(false);
  });
});

describe('parseRetryAfter', () => {
  it('parses seconds and HTTP dates', () => {
    expect(parseRetryAfter('12')).toBe(12);
    const now = Date.parse('2026-11-17T10:00:00Z');
    expect(parseRetryAfter('Tue, 17 Nov 2026 10:00:45 GMT', now)).toBe(45);
    expect(parseRetryAfter('nonsense')).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
  });
});
