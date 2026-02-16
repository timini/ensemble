export interface WilsonInterval {
  center: number;
  lower: number;
  upper: number;
}

/**
 * Abramowitz and Stegun rational approximation for the probit function
 * (inverse of the standard normal CDF). Accurate to about 4.5e-4.
 *
 * @param p Probability in (0, 1)
 * @returns z-score such that P(Z <= z) = p
 */
function probit(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error('probit requires 0 < p < 1');
  }

  // Abramowitz and Stegun approximation 26.2.23
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  if (p < 0.5) {
    const t = Math.sqrt(-2 * Math.log(p));
    return -(
      t -
      (c0 + c1 * t + c2 * t * t) /
        (1 + d1 * t + d2 * t * t + d3 * t * t * t)
    );
  }

  const t = Math.sqrt(-2 * Math.log(1 - p));
  return (
    t -
    (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t)
  );
}

/**
 * Wilson score confidence interval for a binomial proportion.
 * More accurate than the normal approximation for small samples.
 *
 * @param successes Number of correct answers
 * @param total Total number of questions
 * @param confidence Confidence level (default: 0.95)
 * @returns WilsonInterval with center, lower, and upper bounds
 */
export function wilsonScoreInterval(
  successes: number,
  total: number,
  confidence: number = 0.95,
): WilsonInterval {
  if (total === 0) {
    return { center: 0, lower: 0, upper: 0 };
  }

  const z = probit(1 - (1 - confidence) / 2);
  const n = total;
  const pHat = successes / n;
  const z2 = z * z;

  const denominator = 1 + z2 / n;
  const center = (pHat + z2 / (2 * n)) / denominator;
  const margin =
    (z * Math.sqrt((pHat * (1 - pHat)) / n + z2 / (4 * n * n))) / denominator;

  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);

  return { center, lower, upper };
}
