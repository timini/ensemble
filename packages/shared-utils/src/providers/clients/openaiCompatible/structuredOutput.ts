import type { JsonSchema } from '../../types';

/** The response formats tried for structured output, strictest first. */
export type StructuredFormat = 'json_schema' | 'json_object' | 'prompt';

export const STRUCTURED_FORMATS: readonly StructuredFormat[] = ['json_schema', 'json_object', 'prompt'];

/** The `response_format` body field for a format, or undefined for plain prompting. */
export function responseFormatFor(format: StructuredFormat, schema: JsonSchema): unknown {
  if (format === 'json_schema') {
    return { type: 'json_schema', json_schema: { name: schema.name, strict: true, schema: schema.schema } };
  }
  if (format === 'json_object') return { type: 'json_object' };
  return undefined;
}

/**
 * The prompt for a format. Without json_schema the server does not see the
 * schema, so it is added to the prompt.
 */
export function structuredPrompt(format: StructuredFormat, prompt: string, schema: JsonSchema): string {
  if (format === 'json_schema') return prompt;
  return `${prompt}\n\nReply with only a JSON object that matches this JSON schema, with no other text:\n${JSON.stringify(schema.schema)}`;
}

/**
 * True when an HTTP error looks like the server rejecting the response
 * format (400 or 422, or a message naming it), so the next format is worth
 * trying. Key, rate limit and server errors are not retried.
 */
export function isUnsupportedFormatError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 400 || status === 422 || status === 501) return true;
  const message = error instanceof Error ? error.message : '';
  return /response_format|json_schema|json_object/i.test(message) && status === undefined;
}

/**
 * Parse JSON from model output. Accepts bare JSON, a fenced ```json block, or
 * the first balanced `{...}` object in the text (models that ignore the
 * format often wrap the object in prose). Throws when none parses.
 */
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Try the other shapes below.
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      // Fall through to the object scan.
    }
  }

  for (let start = trimmed.indexOf('{'); start !== -1; start = trimmed.indexOf('{', start + 1)) {
    const end = matchingBrace(trimmed, start);
    if (end === -1) continue;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      // Keep scanning.
    }
  }
  throw new Error('No JSON object found in the model output.');
}

/** Index of the brace closing the one at `start`, skipping strings. */
function matchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
