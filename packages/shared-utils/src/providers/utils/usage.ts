import type { TokenUsage } from '../types';

/** Usage block of OpenAI-compatible chat completions (OpenAI, xAI, DeepSeek). */
export interface ChatCompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
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

/** Input and output tokens from an OpenAI-compatible usage block. */
export function fromChatCompletionUsage(usage: ChatCompletionUsage | null | undefined) {
  return usageOf(usage?.prompt_tokens, usage?.completion_tokens);
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
