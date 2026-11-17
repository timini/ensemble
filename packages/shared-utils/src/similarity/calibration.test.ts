import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGREEMENT_THRESHOLDS,
  agreementLevel,
  displayThresholds,
  embeddingModelKey,
  resolveAgreementCalibration,
  type AgreementCalibrationFile,
} from './calibration.js';

const file: AgreementCalibrationFile = {
  schemaVersion: 1,
  models: {
    'openai/text-embedding-3-small': {
      high: 0.72,
      medium: 0.45,
      fittedAt: '2026-11-20',
      pairs: 600,
      agreePairs: 400,
      disagreePairs: 200,
      auc: 0.84,
      source: 'packages/eval/results/2026-11-20-matrix',
    },
  },
};

describe('DEFAULT_AGREEMENT_THRESHOLDS', () => {
  it('matches the uncalibrated (v+1)/2 mapping: high above 0.8, medium from 0.5', () => {
    expect(displayThresholds(DEFAULT_AGREEMENT_THRESHOLDS)).toEqual({ high: 0.8, medium: 0.5 });
  });
});

describe('embeddingModelKey', () => {
  it('joins provider and model, using the preset id of an endpoint', () => {
    expect(embeddingModelKey('openai', 'text-embedding-3-small')).toBe('openai/text-embedding-3-small');
    expect(embeddingModelKey('ollama-2', 'nomic-embed-text')).toBe('ollama/nomic-embed-text');
  });
});

describe('resolveAgreementCalibration', () => {
  it('returns the fitted thresholds for a calibrated model', () => {
    const result = resolveAgreementCalibration(file, 'openai/text-embedding-3-small');
    expect(result.calibrated).toBe(true);
    expect(result.thresholds).toEqual({ high: 0.72, medium: 0.45 });
    expect(result.entry?.pairs).toBe(600);
  });

  it('falls back to the default mapping, marked uncalibrated, for other models', () => {
    expect(resolveAgreementCalibration(file, 'google/gemini-embedding-2')).toEqual({
      calibrated: false,
      thresholds: DEFAULT_AGREEMENT_THRESHOLDS,
      modelKey: 'google/gemini-embedding-2',
    });
    expect(resolveAgreementCalibration(null, null).calibrated).toBe(false);
  });

  it('ignores entries with thresholds out of order or out of range', () => {
    const bad: AgreementCalibrationFile = {
      schemaVersion: 1,
      models: { 'x/y': { ...file.models['openai/text-embedding-3-small']!, high: 0.2, medium: 0.5 } },
    };
    expect(resolveAgreementCalibration(bad, 'x/y').calibrated).toBe(false);
  });
});

describe('agreementLevel', () => {
  it('labels raw cosines with the thresholds', () => {
    const t = { high: 0.7, medium: 0.4 };
    expect(agreementLevel(0.71, t)).toBe('high');
    expect(agreementLevel(0.7, t)).toBe('medium');
    expect(agreementLevel(0.4, t)).toBe('medium');
    expect(agreementLevel(0.39, t)).toBe('low');
  });
});
