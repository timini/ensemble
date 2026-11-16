/**
 * Request rules for OpenAI reasoning models.
 *
 * OpenAI's latest-model guide (checked November 2026): "When reasoning effort
 * is not `none`, remove `temperature`, `top_p`, and `top_logprobs`." This
 * client never sets `reasoning_effort`, so GPT-5 and later models and the
 * o-series run at their default effort and reject a sampling temperature.
 * The `-chat` variants (for example `gpt-5-chat-latest`) are not reasoning
 * models and still accept it.
 */
const REASONING_MODEL_PATTERN = /^(?:o\d+(?:$|-)|gpt-(?:[5-9]|\d{2,})(?:$|[.-]))/;

/**
 * Whether the OpenAI model is a reasoning model that rejects `temperature`.
 *
 * @param model - OpenAI model id, for example `gpt-6-luna`.
 */
export function isOpenAIReasoningModel(model: string): boolean {
  return REASONING_MODEL_PATTERN.test(model) && !model.includes('-chat');
}

/** Returns `{ temperature }` only when it was requested and the model accepts it. */
export function openAISamplingParams(
  model: string,
  temperature: number | undefined,
): { temperature?: number } {
  return temperature !== undefined && !isOpenAIReasoningModel(model) ? { temperature } : {};
}
