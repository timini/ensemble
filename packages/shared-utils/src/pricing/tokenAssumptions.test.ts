import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ESTIMATE_TOKENS,
  applyTokenCalibration,
  type TokenCalibration,
} from './tokenAssumptions';
import { ESTIMATE_TOKENS, ESTIMATE_TOKENS_CALIBRATED } from './estimateRun';
import { TOKEN_CALIBRATION } from './tokenCalibration';

const calibration: TokenCalibration = {
  schemaVersion: 1,
  fittedAt: '2026-11-20',
  source: 'packages/eval/results/2026-11-20-matrix',
  calls: 2400,
  reportedShare: 0.98,
  tokens: { answer: { low: 150, high: 3100 }, overhead: 350 },
};

describe('applyTokenCalibration', () => {
  it('keeps the defaults when there is no calibration', () => {
    expect(applyTokenCalibration(DEFAULT_ESTIMATE_TOKENS, null)).toEqual(DEFAULT_ESTIMATE_TOKENS);
  });

  it('replaces only the fitted assumptions', () => {
    const tokens = applyTokenCalibration(DEFAULT_ESTIMATE_TOKENS, calibration);
    expect(tokens.answer).toEqual({ low: 150, high: 3100 });
    expect(tokens.overhead).toBe(350);
    expect(tokens.verdict).toEqual(DEFAULT_ESTIMATE_TOKENS.verdict);
    expect(tokens.critique).toEqual(DEFAULT_ESTIMATE_TOKENS.critique);
  });

  it('ignores ranges that are not positive and ordered', () => {
    const bad = { ...calibration, tokens: { answer: { low: 500, high: 100 } } };
    expect(applyTokenCalibration(DEFAULT_ESTIMATE_TOKENS, bad).answer).toEqual(DEFAULT_ESTIMATE_TOKENS.answer);
  });
});

describe('ESTIMATE_TOKENS', () => {
  it('comes from the committed calibration, or the defaults when none is committed', () => {
    expect(ESTIMATE_TOKENS).toEqual(applyTokenCalibration(DEFAULT_ESTIMATE_TOKENS, TOKEN_CALIBRATION));
    expect(ESTIMATE_TOKENS_CALIBRATED).toBe(TOKEN_CALIBRATION !== null);
  });
});
