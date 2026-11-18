/**
 * The summarizer to use: the chosen one, or the fallback (the first model)
 * when none is chosen. An empty id counts as none, since a preset saved
 * without a summarizer stores `''`.
 *
 * @param chosen - the summarizer the user picked, if any
 * @param fallback - the model to use otherwise
 */
export function summarizerOrFallback(
  chosen: string | null | undefined,
  fallback: string | undefined,
): string | undefined {
  return chosen !== null && chosen !== undefined && chosen !== ""
    ? chosen
    : fallback;
}
