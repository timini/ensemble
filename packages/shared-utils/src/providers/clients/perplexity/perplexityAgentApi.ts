/**
 * Helpers for Perplexity's Agent API (`POST /v1/agent`).
 *
 * Perplexity ended Sonar Chat Completions support on 2026-09-27. The Agent
 * API replaces it: the prompt goes in `input`, and either `model` (a
 * `provider/model` id) or `effort` (a named preset such as `fast`) picks what
 * runs. Perplexity's migration guide maps `sonar` and `sonar-pro` to `fast`,
 * `sonar-reasoning-pro` to `low` and `sonar-deep-research` to `high`.
 *
 * Docs: https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/how-to
 */

export const PERPLEXITY_API_BASE = 'https://api.perplexity.ai/v1';

/** Prefix that turns an effort preset into a model id the app can show. */
const MODEL_ID_PREFIX = 'perplexity-';

/**
 * Model ids the app offers. Each is an Agent API effort preset with web
 * search. `high`, `xhigh` and `ultra` are left out: they run long multi-step
 * research and cost far more per request.
 */
export const PERPLEXITY_TEXT_MODELS = ['perplexity-fast', 'perplexity-low', 'perplexity-medium'];

const LEGACY_SONAR_EFFORT: Record<string, string> = {
  sonar: 'fast',
  'sonar-pro': 'fast',
  'sonar-reasoning': 'low',
  'sonar-reasoning-pro': 'low',
  'sonar-deep-research': 'high',
};

/** The part of an Agent API request body that selects what runs. */
export type AgentModelSelector = { effort: string } | { model: string };

/**
 * Converts an app model id to the Agent API's `effort` or `model` field.
 *
 * @param modelId - `perplexity-<effort>`, a retired Sonar id, or a
 *   `provider/model` id.
 */
export function toAgentModelSelector(modelId: string): AgentModelSelector {
  if (modelId.includes('/')) {
    return { model: modelId };
  }
  const legacy = LEGACY_SONAR_EFFORT[modelId];
  if (legacy) {
    return { effort: legacy };
  }
  return {
    effort: modelId.startsWith(MODEL_ID_PREFIX) ? modelId.slice(MODEL_ID_PREFIX.length) : modelId,
  };
}

/** One parsed server-sent event from the Agent API stream. */
export interface AgentStreamEvent {
  type?: string;
  delta?: unknown;
  message?: string;
  error?: { message?: string };
  response?: {
    status?: string;
    error?: { message?: string } | null;
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } | null;
  };
}

/**
 * Reads a `text/event-stream` body and yields each JSON `data:` payload.
 * Handles events split across chunks, CRLF line endings and a `[DONE]` marker.
 */
export async function* readAgentEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AgentStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const parseBlock = (block: string): AgentStreamEvent | null => {
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data || data === '[DONE]') return null;
    return JSON.parse(data) as AgentStreamEvent;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const event = parseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (event) yield event;
        boundary = buffer.indexOf('\n\n');
      }
    }
    const tail = parseBlock((buffer + decoder.decode()).trim());
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Builds an error from a non-2xx Agent API response, keeping the status code,
 * the response headers (for Retry-After) and the provider's message.
 */
export async function agentHttpError(response: Response): Promise<Error> {
  let detail = response.statusText;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    detail = body.error?.message ?? detail;
  } catch {
    // Body was not JSON; keep the status text.
  }
  return Object.assign(new Error(`${response.status} ${detail}`.trim()), {
    status: response.status,
    headers: response.headers,
  });
}
