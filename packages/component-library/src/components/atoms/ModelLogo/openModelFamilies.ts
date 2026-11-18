/**
 * Model families recognised in OpenAI-compatible model ids
 * (`ollama/llama3.2:3b`, `openrouter/qwen/qwen-2.5-72b`). First match wins.
 */
export const OPEN_MODEL_FAMILIES = [
  { key: 'meta', pattern: /llama/i },
  { key: 'qwen', pattern: /qwen|qwq/i },
  { key: 'gemma', pattern: /gemma/i },
  { key: 'mistral', pattern: /mistral|mixtral|codestral|ministral/i },
  { key: 'deepseek', pattern: /deepseek/i },
  { key: 'claude', pattern: /claude/i },
  { key: 'gemini', pattern: /gemini/i },
  { key: 'grok', pattern: /grok/i },
  { key: 'openai', pattern: /gpt|(^|\/)o\d/i },
] as const;

export type OpenModelFamilyKey = (typeof OPEN_MODEL_FAMILIES)[number]['key'];

/** The family of an open model id, or `server` when none matches. */
export function openModelFamily(signal: string): OpenModelFamilyKey | 'server' {
  return OPEN_MODEL_FAMILIES.find((family) => family.pattern.test(signal))?.key ?? 'server';
}
