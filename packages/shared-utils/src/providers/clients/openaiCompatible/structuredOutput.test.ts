import { describe, it, expect } from 'vitest';
import { extractJson, isUnsupportedFormatError, responseFormatFor, structuredPrompt } from './structuredOutput';

const schema = { name: 'answer', schema: { type: 'object' } };

describe('extractJson', () => {
  it('parses bare JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses a fenced block', () => {
    expect(extractJson('Here:\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it('finds the first balanced object in prose, ignoring braces in strings', () => {
    expect(extractJson('I think {"a":"x}y","b":{"c":3}} is right')).toEqual({ a: 'x}y', b: { c: 3 } });
  });

  it('skips a broken object and takes a later one', () => {
    expect(extractJson('{not json} then {"ok":true}')).toEqual({ ok: true });
  });

  it('throws when there is no JSON', () => {
    expect(() => extractJson('no json here')).toThrow(/No JSON/);
  });
});

describe('formats', () => {
  it('builds response_format per format', () => {
    expect(responseFormatFor('json_schema', schema)).toEqual({
      type: 'json_schema',
      json_schema: { name: 'answer', strict: true, schema: { type: 'object' } },
    });
    expect(responseFormatFor('json_object', schema)).toEqual({ type: 'json_object' });
    expect(responseFormatFor('prompt', schema)).toBeUndefined();
  });

  it('adds the schema to the prompt when the server does not see it', () => {
    expect(structuredPrompt('json_schema', 'Q', schema)).toBe('Q');
    expect(structuredPrompt('json_object', 'Q', schema)).toContain('{"type":"object"}');
  });

  it('treats 400 and 422 as an unsupported format, not 401 or 500', () => {
    expect(isUnsupportedFormatError({ status: 400 })).toBe(true);
    expect(isUnsupportedFormatError({ status: 422 })).toBe(true);
    expect(isUnsupportedFormatError({ status: 401 })).toBe(false);
    expect(isUnsupportedFormatError({ status: 500 })).toBe(false);
  });
});
