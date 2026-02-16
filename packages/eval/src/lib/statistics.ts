export interface BinaryPair {
  modelCorrect: boolean;
  strategyCorrect: boolean;
}

export interface McNemarResult {
  n11: number;
  n10: number;
  n01: number;
  n00: number;
  chiSquared: number;
  pValue: number;
}

export interface BootstrapDeltaResult {
  meanDelta: number;
  ciLow: number;
  ciHigh: number;
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absX);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absX * absX));
  return sign * y;
}

function erfc(x: number): number {
  return 1 - erf(x);
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }

  const position = clamp01(p) * (sorted.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const weight = position - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

export function computeMcNemar(pairs: BinaryPair[]): McNemarResult {
  let n11 = 0;
  let n10 = 0;
  let n01 = 0;
  let n00 = 0;

  for (const pair of pairs) {
    if (pair.modelCorrect && pair.strategyCorrect) {
      n11 += 1;
    } else if (pair.modelCorrect && !pair.strategyCorrect) {
      n10 += 1;
    } else if (!pair.modelCorrect && pair.strategyCorrect) {
      n01 += 1;
    } else {
      n00 += 1;
    }
  }

  const discordant = n10 + n01;
  const chiSquared =
    discordant === 0 ? 0 : ((Math.abs(n10 - n01) - 1) ** 2) / discordant;
  const pValue = discordant === 0 ? 1 : erfc(Math.sqrt(chiSquared / 2));

  return { n11, n10, n01, n00, chiSquared, pValue };
}

export function computePairedBootstrapDelta(
  pairs: BinaryPair[],
  iterations = 10_000,
  random: () => number = Math.random,
): BootstrapDeltaResult {
  if (pairs.length === 0) {
    return { meanDelta: 0, ciLow: 0, ciHigh: 0 };
  }

  const deltas: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    let modelCorrect = 0;
    let strategyCorrect = 0;
    for (let j = 0; j < pairs.length; j += 1) {
      const sampleIndex = Math.floor(random() * pairs.length);
      const sampled = pairs[sampleIndex];
      modelCorrect += sampled.modelCorrect ? 1 : 0;
      strategyCorrect += sampled.strategyCorrect ? 1 : 0;
    }

    const modelAccuracy = modelCorrect / pairs.length;
    const strategyAccuracy = strategyCorrect / pairs.length;
    deltas.push(strategyAccuracy - modelAccuracy);
  }

  deltas.sort((left, right) => left - right);
  const meanDelta =
    deltas.reduce((sum, value) => sum + value, 0) / deltas.length;

  return {
    meanDelta,
    ciLow: quantile(deltas, 0.025),
    ciHigh: quantile(deltas, 0.975),
  };
}

export interface CorrectedPValue {
  originalPValue: number;
  correctedPValue: number;
  significant: boolean;
  label: string;
}

/**
 * Holm-Bonferroni step-down correction for multiple comparisons.
 * Controls the family-wise error rate when testing multiple hypotheses.
 *
 * @param pValues Array of { pValue, label } for each test
 * @param alpha Family-wise error rate (default: 0.05)
 * @returns Array of corrected p-values with significance flags
 */
export function holmBonferroni(
  pValues: Array<{ pValue: number; label: string }>,
  alpha: number = 0.05,
): CorrectedPValue[] {
  if (pValues.length === 0) {
    return [];
  }

  const m = pValues.length;

  // Create indexed entries and sort by p-value ascending
  const indexed = pValues.map((entry, originalIndex) => ({
    ...entry,
    originalIndex,
  }));
  indexed.sort((a, b) => a.pValue - b.pValue);

  // Compute corrected p-values with monotonicity enforcement
  const corrected: number[] = [];
  for (let i = 0; i < m; i += 1) {
    const raw = Math.min(1, indexed[i].pValue * (m - i));
    corrected.push(i === 0 ? raw : Math.max(raw, corrected[i - 1]));
  }

  // Determine significance using step-down procedure
  const significant: boolean[] = new Array<boolean>(m).fill(false);
  for (let i = 0; i < m; i += 1) {
    const threshold = alpha / (m - i);
    if (indexed[i].pValue <= threshold) {
      significant[i] = true;
    } else {
      // Step-down: stop at first non-rejection
      break;
    }
  }

  // Build results in sorted order, then restore original order
  const sortedResults: Array<CorrectedPValue & { originalIndex: number }> =
    indexed.map((entry, i) => ({
      originalPValue: entry.pValue,
      correctedPValue: corrected[i],
      significant: significant[i],
      label: entry.label,
      originalIndex: entry.originalIndex,
    }));

  // Restore original order
  const results: CorrectedPValue[] = new Array<CorrectedPValue>(m);
  for (const item of sortedResults) {
    results[item.originalIndex] = {
      originalPValue: item.originalPValue,
      correctedPValue: item.correctedPValue,
      significant: item.significant,
      label: item.label,
    };
  }

  return results;
}
