/**
 * Request rules that differ between Claude model generations.
 *
 * Sources (checked November 2026): Anthropic's model migration guide and the
 * structured outputs page on platform.claude.com.
 *
 * - `temperature`, `top_p` and `top_k` return HTTP 400 on Claude Opus 4.7 and
 *   later, Sonnet 5, and every Fable and Mythos model. Claude Sonnet 5.5 and
 *   Haiku 5.5 accept only the default value. Unknown (newer) models are
 *   treated as rejecting them, since every release since Opus 4.7 has.
 * - A forced `tool_choice` (`any` or `tool`) returns HTTP 400 on Claude
 *   Opus 5.5, Sonnet 5.5, Fable 5.1 and 5.2. Structured outputs
 *   (`output_config.format`) work on every model from the 4.1 and 4.5 families
 *   onward, so they replace the forced tool call there.
 */

/** Claude 3.x and 4.x models released before Opus 4.7 still accept sampling parameters. */
const SAMPLING_PATTERN = /^claude-(?:3|(?:opus|sonnet|haiku)-4(?:-[0-6](?:-|$)|-\d{8}|$))/;

/** Models released before structured outputs launched: Claude 3.x, Opus 4 and Sonnet 4. */
const NO_STRUCTURED_OUTPUT_PATTERN = /^claude-(?:3|(?:opus|sonnet)-4(?:-0)?(?:-\d{8})?$)/;

/**
 * Whether the model accepts a non-default `temperature`.
 *
 * @param model - Anthropic model id, for example `claude-sonnet-5-5`.
 */
export function acceptsSamplingParams(model: string): boolean {
  return SAMPLING_PATTERN.test(model);
}

/**
 * Whether the model supports structured outputs (`output_config.format`).
 * Models that do not get a forced tool call instead.
 *
 * @param model - Anthropic model id.
 */
export function supportsStructuredOutputs(model: string): boolean {
  return !NO_STRUCTURED_OUTPUT_PATTERN.test(model);
}
