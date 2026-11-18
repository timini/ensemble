import type { ProviderName } from '../types';
import { sanitizeProviderErrorMessage } from '../utils/sanitizeSensitiveData';

/**
 * What went wrong with a provider call, in terms the UI can act on.
 *
 * - `invalid_key`: the provider rejected the key (401 or 403)
 * - `missing_key`: no key is set for the provider, so no request was sent
 * - `rate_limited`: 429; `retryAfterSeconds` is set when the provider said
 * - `timeout`: the client gave up waiting (see DEFAULT_STREAM_TIMEOUT_MS)
 * - `provider_unavailable`: 5xx or a network failure
 * - `cancelled`: the caller aborted the call (AbortSignal), no answer is expected
 * - `insufficient_credits`: Pro mode only, the credit balance cannot cover the run
 * - `other`: anything else (bad request, unknown model, refusal)
 */
export type ProviderErrorKind =
  | 'invalid_key'
  | 'missing_key'
  | 'rate_limited'
  | 'timeout'
  | 'provider_unavailable'
  | 'cancelled'
  | 'insufficient_credits'
  | 'other';

export interface ProviderErrorOptions {
  provider?: ProviderName;
  status?: number;
  retryAfterSeconds?: number;
  cause?: unknown;
}

/** A provider failure with its kind. The message is already sanitized. */
export class ProviderError extends Error {
  override readonly name = 'ProviderError';
  readonly kind: ProviderErrorKind;
  readonly provider?: ProviderName;
  readonly status?: number;
  readonly retryAfterSeconds?: number;

  constructor(message: string, kind: ProviderErrorKind, options: ProviderErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.kind = kind;
    this.provider = options.provider;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

/** True for a ProviderError, or an object shaped like one (for example after structured cloning). */
export function isProviderError(error: unknown): error is ProviderError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'ProviderError' &&
    typeof (error as { kind?: unknown }).kind === 'string'
  );
}

export interface ClassifyOptions {
  provider?: ProviderName;
  /** Prefix for the message, such as "Anthropic API error". */
  label?: string;
}

/**
 * Turns any error thrown by a provider SDK, fetch or our own code into a
 * ProviderError with a kind. A ProviderError passes through unchanged.
 */
export function classifyProviderError(error: unknown, options: ClassifyOptions = {}): ProviderError {
  if (isProviderError(error)) return error;

  const rawMessage = error instanceof Error ? error.message : String(error);
  const detail = sanitizeProviderErrorMessage(rawMessage, 'Unknown provider error.');
  const message = options.label ? `${options.label}: ${detail}` : detail;
  const status = statusOf(error, rawMessage);
  const kind = kindOf(error, status, rawMessage);
  const retryAfterSeconds = kind === 'rate_limited' ? retryAfterOf(error) : undefined;

  return new ProviderError(message, kind, {
    provider: options.provider,
    status,
    retryAfterSeconds,
    cause: error,
  });
}

function nameOf(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' ? name : '';
}

/** A ProviderError of kind `cancelled`, for a call stopped through its AbortSignal. */
export function cancelledError(provider?: ProviderName): ProviderError {
  return new ProviderError('The request was cancelled.', 'cancelled', { provider });
}

function kindOf(error: unknown, status: number | undefined, message: string): ProviderErrorKind {
  if (status !== undefined) {
    if (status === 401 || status === 403) return 'invalid_key';
    if (status === 429) return 'rate_limited';
    if (status === 408) return 'timeout';
    if (status >= 500) return 'provider_unavailable';
    return 'other';
  }

  const name = nameOf(error);
  if (name === 'AbortError' || name === 'APIUserAbortError') return 'cancelled';
  if (name === 'APIConnectionTimeoutError' || /timed? ?out/i.test(message)) return 'timeout';
  if (name === 'APIConnectionError') return 'provider_unavailable';
  if (/missing api key/i.test(message)) return 'missing_key';
  if (/failed to fetch|fetch failed|networkerror|load failed|econnrefused|econnreset|enotfound|network error/i.test(message)) {
    return 'provider_unavailable';
  }
  return 'other';
}

function statusOf(error: unknown, message: string): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const direct = (error as { status?: unknown }).status;
    if (isHttpErrorStatus(direct)) return direct;
    const nested = (error as { response?: { status?: unknown } }).response?.status;
    if (isHttpErrorStatus(nested)) return nested;
  }

  const match =
    /^(\d{3})\b/.exec(message) ??
    /\[(\d{3})[ \]]/.exec(message) ??
    /status code (\d{3})/i.exec(message) ??
    /\((\d{3})\)/.exec(message);
  const parsed = match ? Number(match[1]) : undefined;
  return isHttpErrorStatus(parsed) ? parsed : undefined;
}

function isHttpErrorStatus(value: unknown): value is number {
  return typeof value === 'number' && value >= 400 && value <= 599;
}

function retryAfterOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;

  const headers =
    (error as { headers?: unknown }).headers ??
    (error as { response?: { headers?: unknown } }).response?.headers;
  const retryAfterMs = Number(readHeader(headers, 'retry-after-ms'));
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return Math.ceil(retryAfterMs / 1000);
  const fromHeader = parseRetryAfter(readHeader(headers, 'retry-after'));
  if (fromHeader !== undefined) return fromHeader;

  // Google puts the delay in RetryInfo error details, as "17s".
  const details = (error as { errorDetails?: unknown }).errorDetails;
  if (Array.isArray(details)) {
    for (const detail of details) {
      const delay = (detail as { retryDelay?: unknown } | null)?.retryDelay;
      if (typeof delay === 'string') {
        const seconds = Number.parseFloat(delay);
        if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
      }
    }
  }
  return undefined;
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined;
  const getter = (headers as { get?: unknown }).get;
  if (typeof getter === 'function') {
    const value = (getter as (key: string) => unknown).call(headers, name);
    return typeof value === 'string' ? value : undefined;
  }
  const record = headers as Record<string, unknown>;
  const key = Object.keys(record).find((k) => k.toLowerCase() === name);
  const value = key ? record[key] : undefined;
  return typeof value === 'string' ? value : undefined;
}

/** Seconds from a Retry-After header value (delay in seconds or an HTTP date). */
export function parseRetryAfter(value: string | undefined, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.ceil(Number(trimmed));
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - now) / 1000));
}
