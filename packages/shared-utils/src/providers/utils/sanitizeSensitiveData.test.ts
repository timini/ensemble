import { describe, expect, it } from 'vitest';
import {
  redactSensitiveData,
  sanitizeProviderErrorMessage,
} from './sanitizeSensitiveData';

describe('sanitizeSensitiveData', () => {
  it('redacts key-like query params and bearer tokens', () => {
    const message =
      'Request failed: https://example.com/v1/models?key=AIzaSyAbCdEfGh1234567890 and Authorization: Bearer sk-test-1234567890';

    const result = redactSensitiveData(message);

    expect(result).toContain('?key=[REDACTED]');
    expect(result).toContain('Bearer [REDACTED]');
    expect(result).not.toContain('AIzaSyAbCdEfGh1234567890');
    expect(result).not.toContain('sk-test-1234567890');
  });

  it('redacts known provider API key shapes in plain text', () => {
    const result = redactSensitiveData(
      'Invalid key sk-ant-abcdefghijklmnop and pplx-1234567890',
    );

    expect(result).toBe('Invalid key [REDACTED] and [REDACTED]');
  });

  it('uses fallback for empty messages', () => {
    expect(sanitizeProviderErrorMessage('', 'fallback')).toBe('fallback');
  });
});
