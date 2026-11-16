/**
 * Request rules for OpenAI reasoning models.
 *
 * OpenAI's latest-model guide (checked November 2026): "When reasoning effort
 * is not `none`, remove `temperature`, `top_p`, and `top_logprobs`." This
 * client never sets `reasoning_effort`, so what matters is each model's
 * default effort:
 *
 * - The o-series, `gpt-5`, the GPT-5.1 and GPT-5.2 `-codex` and `-pro`
 *   variants, GPT-5.5, GPT-5.6 and the GPT-6 family default to an effort
 *   above `none` (OpenAI's reasoning guide gives `medium` for GPT-5.5,
 *   GPT-5.6, GPT-6 Sol and GPT-6 Luna, and GPT-6 Astra does not support
 *   `none`). They reject a sampling temperature, so it is omitted.
 * - Base `gpt-5.1` and `gpt-5.2` (and their dated snapshots) default to
 *   `none`, so they accept temperature and it is sent.
 * - The `-chat` variants (for example `gpt-5-chat-latest`) are not reasoning
 *   models and accept temperature.
 *
 * We do not force `reasoning_effort: 'none'` to keep temperature, because
 * that would switch off reasoning on models the user picked for it.
 */
const REASONING_MODEL_PATTERN = /^(?:o\d+(?:$|-)|gpt-(?:[5-9]|\d{2,})(?:$|[.-]))/;

/** Base GPT-5.1 and GPT-5.2 ids, bare or with a date snapshot suffix. */
const DEFAULT_EFFORT_NONE_PATTERN = /^gpt-5\.[12](?:$|-\d{4}-\d{2}-\d{2}$)/;

/**
 * Whether the OpenAI model runs at a reasoning effort above `none` by
 * default and so rejects `temperature`.
 *
 * @param model - OpenAI model id, for example `gpt-6-luna`.
 */
export function isOpenAIReasoningModel(model: string): boolean {
  return (
    REASONING_MODEL_PATTERN.test(model) &&
    !model.includes('-chat') &&
    !DEFAULT_EFFORT_NONE_PATTERN.test(model)
  );
}

/** Returns `{ temperature }` only when it was requested and the model accepts it. */
export function openAISamplingParams(
  model: string,
  temperature: number | undefined,
): { temperature?: number } {
  return temperature !== undefined && !isOpenAIReasoningModel(model) ? { temperature } : {};
}
