export interface FisherExactResult {
  pValue: number;
  oddsRatio: number;
}

/**
 * Compute the natural log of n! using the direct sum of logs.
 * For n <= 1, returns 0 (i.e. log(1) = 0).
 */
function logFactorial(n: number): number {
  let result = 0;
  for (let i = 2; i <= n; i += 1) {
    result += Math.log(i);
  }
  return result;
}

/**
 * Compute the log-probability of a specific 2x2 table under the
 * hypergeometric distribution, given fixed marginals.
 *
 * logP = logFact(a+b) + logFact(c+d) + logFact(a+c) + logFact(b+d)
 *      - logFact(n) - logFact(a) - logFact(b) - logFact(c) - logFact(d)
 */
function logHypergeometricProb(
  a: number,
  b: number,
  c: number,
  d: number,
): number {
  return (
    logFactorial(a + b) +
    logFactorial(c + d) +
    logFactorial(a + c) +
    logFactorial(b + d) -
    logFactorial(a + b + c + d) -
    logFactorial(a) -
    logFactorial(b) -
    logFactorial(c) -
    logFactorial(d)
  );
}

/**
 * One-sided Fisher's exact test for a 2x2 contingency table.
 * Tests whether accuracy has decreased (one-sided, lower tail).
 *
 * Table layout:
 *   |           | Correct | Wrong |
 *   |-----------|---------|-------|
 *   | Baseline  |    a    |   b   |
 *   | Current   |    c    |   d   |
 *
 * The test fixes the marginals (row and column totals) and sums the
 * hypergeometric probabilities for all tables where the current correct
 * count is as low or lower than the observed value of c.
 *
 * @param a Baseline correct count
 * @param b Baseline wrong count
 * @param c Current correct count
 * @param d Current wrong count
 * @returns FisherExactResult with p-value and odds ratio
 */
export function fisherExact(
  a: number,
  b: number,
  c: number,
  d: number,
): FisherExactResult {
  if (a < 0 || b < 0 || c < 0 || d < 0) {
    throw new Error('Contingency table values must be non-negative.');
  }

  const n = a + b + c + d;

  if (n === 0) {
    return { pValue: 1, oddsRatio: 1 };
  }

  // Compute odds ratio: (a * d) / (b * c)
  const numerator = a * d;
  const denominator = b * c;
  let oddsRatio: number;

  if (denominator === 0) {
    oddsRatio = numerator > 0 ? Infinity : 1;
  } else {
    oddsRatio = numerator / denominator;
  }

  // Fixed marginals
  const rowBaseline = a + b;
  const rowCurrent = c + d;
  const colCorrect = a + c;

  // For the lower tail test, we sum P(X <= c_observed) where X is the
  // current correct count. X ranges from max(0, colCorrect - rowBaseline)
  // to min(rowCurrent, colCorrect). We iterate from the minimum possible
  // value of c up to the observed c.
  const minC = Math.max(0, colCorrect - rowBaseline);

  let pValue = 0;
  for (let ci = minC; ci <= c; ci += 1) {
    const ai = colCorrect - ci;
    const bi = rowBaseline - ai;
    const di = rowCurrent - ci;
    pValue += Math.exp(logHypergeometricProb(ai, bi, ci, di));
  }

  // Clamp to [0, 1] to account for floating point imprecision
  pValue = Math.max(0, Math.min(1, pValue));

  return { pValue, oddsRatio };
}
