import { sanitizeProviderErrorMessage } from '../../utils/sanitizeSensitiveData';

/** Connection details of one OpenAI-compatible server. */
export interface OpenAICompatibleConnection {
  /** API root ending in `/v1`, for example `http://localhost:11434/v1`. */
  baseURL: string;
  /** Bearer key. Empty for local servers that need none. */
  apiKey: string;
  /** Injected fetch, for tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * An HTTP error from an OpenAI-compatible server. Carries `status` and
 * `headers` so classifyProviderError can read the kind and Retry-After.
 */
export class OpenAICompatibleHttpError extends Error {
  override readonly name = 'OpenAICompatibleHttpError';

  constructor(
    message: string,
    readonly status: number,
    readonly headers: Headers,
  ) {
    super(message);
  }
}

function joinUrl(baseURL: string, path: string): string {
  return `${baseURL.trim().replace(/\/+$/, '')}${path}`;
}

/** Headers for a request. No Authorization header is sent without a key. */
export function buildHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
  return headers;
}

async function errorFromResponse(response: Response): Promise<OpenAICompatibleHttpError> {
  let detail = '';
  try {
    const text = await response.text();
    try {
      const body = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
      detail =
        typeof body.error === 'string' ? body.error : (body.error?.message ?? body.message ?? text);
    } catch {
      detail = text;
    }
  } catch {
    detail = response.statusText;
  }
  const message = sanitizeProviderErrorMessage(detail || response.statusText, 'Request failed.');
  return new OpenAICompatibleHttpError(`${response.status} ${message}`, response.status, response.headers);
}

/**
 * Send a request to `{baseURL}{path}` and return the response, or throw an
 * OpenAICompatibleHttpError for a non-2xx status.
 */
export async function openAICompatibleRequest(
  connection: OpenAICompatibleConnection,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal },
): Promise<Response> {
  const doFetch = connection.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const response = await doFetch(joinUrl(connection.baseURL, path), {
    method: init.method,
    headers: buildHeaders(connection.apiKey),
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    signal: init.signal,
  });
  if (!response.ok) throw await errorFromResponse(response);
  return response;
}

/**
 * Read a server-sent event stream and yield the parsed JSON of each `data:`
 * line, stopping at `data: [DONE]`. Lines that are not JSON are skipped.
 */
export async function* readServerSentEvents<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = done ? '' : (lines.pop() ?? '');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice('data:'.length).trim();
      if (data === '[DONE]') return;
      try {
        yield JSON.parse(data) as T;
      } catch {
        // Comments, keep-alives and partial lines carry no chunk.
      }
    }
    if (done) return;
  }
}
