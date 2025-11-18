import { describe, expect, it } from 'vitest';
import { errorMessage, toError } from '~/lib/errors';

describe('toError', () => {
  it('returns the same instance when provided an Error', () => {
    const original = new Error('boom');
    expect(toError(original)).toBe(original);
  });

  it('wraps string inputs in an Error object', () => {
    const result = toError('bad request');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('bad request');
  });

  it('stringifies plain objects', () => {
    const payload = { status: 500, reason: 'exploded' };
    const result = toError(payload);
    expect(result.message).toBe(JSON.stringify(payload));
  });

  it('falls back to provided message when stringification fails', () => {
    const recursive: Record<string, unknown> = {};
    recursive.self = recursive;

    const result = toError(recursive, 'fallback');
    expect(result.message).toBe('fallback');
  });
});

describe('errorMessage', () => {
  it('delegates to toError for message resolution', () => {
    expect(errorMessage('problem')).toBe('problem');
  });

  it('supports custom fallback strings', () => {
    const circular: Record<string, unknown> = {};
    circular.loop = circular;

    expect(errorMessage(circular, 'custom')).toBe('custom');
  });
});
