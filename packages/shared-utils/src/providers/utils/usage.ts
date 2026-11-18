import type { TokenUsage } from '../types';

/** Usage block of OpenAI-compatible chat completions (OpenAI, xAI, DeepSeek). */
export interface ChatCompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  /**
   * OpenAI counts reasoning tokens inside `completion_tokens`. xAI reports
   * them here only, outside `completion_tokens`, and adds them to
   * `total_tokens`.
   */
  completion_tokens_details?: { reasoning_tokens?: number } | null;
}

/** Usage metadata of the Gemini API. Thinking tokens are billed as output. */
export interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

/** Usage block of Responses-style APIs (Perplexity Agent API). */
export interface ResponsesUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

function usageOf(input: number | undefined, output: number | undefined): TokenUsage | undefined {
  if (input === undefined && output === undefined) return undefined;
  const usage = { inputTokens: input ?? 0, outputTokens: output ?? 0 };
  return usage.inputTokens + usage.outputTokens > 0 ? usage : undefined;
}

/**
 * Input and output tokens from an OpenAI-compatible usage block. Output is
 * the larger of `completion_tokens` and `total_tokens - prompt_tokens`, so
 * xAI reasoning tokens (left out of `completion_tokens` but billed as output)
 * are counted. For OpenAI and DeepSeek the two values are equal.
 */
export function fromChatCompletionUsage(usage: ChatCompletionUsage | null | undefined) {
  if (!usage) return undefined;
  const { prompt_tokens: prompt, completion_tokens: completion, total_tokens: total } = usage;
  const rest = total !== undefined && prompt !== undefined ? total - prompt : undefined;
  const output =
    completion === undefined ? rest : rest === undefined ? completion : Math.max(completion, rest);
  return usageOf(prompt, output);
}

/** Input and output tokens from Gemini usage metadata. */
export function fromGeminiUsage(usage: GeminiUsage | null | undefined) {
  if (!usage) return undefined;
  const output =
    usage.candidatesTokenCount === undefined && usage.thoughtsTokenCount === undefined
      ? undefined
      : (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
  return usageOf(usage.promptTokenCount, output);
}

/** Input and output tokens from a Responses-style usage block. */
export function fromResponsesUsage(usage: ResponsesUsage | null | undefined) {
  return usageOf(usage?.input_tokens, usage?.output_tokens);
}
