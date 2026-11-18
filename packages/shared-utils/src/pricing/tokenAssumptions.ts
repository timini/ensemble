/**
 * Token assumptions behind estimateRun's cost range, and how a fitted
 * calibration (src/pricing/tokenCalibration.ts, written by
 * `ensemble-eval calibrate-tokens` from recorded usage) replaces them.
 */

export interface TokenRange {
  low: number;
  high: number;
}

export interface EstimateTokens {
  /** Output tokens of one answer, synthesis or summary, hidden reasoning included. */
  answer: TokenRange;
  /** Output tokens of a vote, ranking or judge verdict. */
  verdict: TokenRange;
  /** Output tokens of a council critique or rebuttal. */
  critique: TokenRange;
  /** Instruction tokens added to each consensus prompt. */
  overhead: number;
}

/** A fit of the assumptions from recorded usage. Only the fitted fields are set. */
export interface TokenCalibration {
  schemaVersion: 1;
  /** Date of the fit (YYYY-MM-DD). */
  fittedAt: string;
  /** Results directories the usage came from. */
  source: string;
  /** Calls the fit used. */
  calls: number;
  /** Share of those calls whose usage the provider reported (the rest were estimated from text). */
  reportedShare: number;
  tokens: Partial<EstimateTokens>;
}

/**
 * Hand-set assumptions, used when no calibration is committed. The low end
 * assumes short answers and the high end long ones, including hidden
 * reasoning tokens, which are billed as output.
 */
export const DEFAULT_ESTIMATE_TOKENS: EstimateTokens = {
  answer: { low: 200, high: 2000 },
  verdict: { low: 20, high: 400 },
  critique: { low: 100, high: 800 },
  overhead: 300,
};

function validRange(range: TokenRange | undefined): range is TokenRange {
  return Boolean(range && range.low > 0 && range.high >= range.low && Number.isFinite(range.high));
}

/** The defaults with each valid fitted field from `calibration` put in their place. */
export function applyTokenCalibration(
  defaults: EstimateTokens,
  calibration: TokenCalibration | null,
): EstimateTokens {
  const fitted = calibration?.tokens ?? {};
  const range = (key: 'answer' | 'verdict' | 'critique') =>
    validRange(fitted[key]) ? { ...fitted[key] } : { ...defaults[key] };
  return {
    answer: range('answer'),
    verdict: range('verdict'),
    critique: range('critique'),
    overhead:
      typeof fitted.overhead === 'number' && fitted.overhead >= 0 ? fitted.overhead : defaults.overhead,
  };
}
