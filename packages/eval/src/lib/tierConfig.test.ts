import { describe, expect, it } from 'vitest';

import type { TierConfig } from './regressionTypes.js';
import {
  CI_TIER_CONFIG,
  HOMOGENEOUS_CI_TIER_CONFIG,
  HOMOGENEOUS_POST_MERGE_TIER_CONFIG,
  POST_MERGE_TIER_CONFIG,
  getTierConfig,
} from './tierConfig.js';

describe('CI_TIER_CONFIG', () => {
  it('has name "ci"', () => {
    expect(CI_TIER_CONFIG.name).toBe('ci');
  });

  it('includes 100 questions across 10 datasets', () => {
    expect(CI_TIER_CONFIG.datasets).toEqual([
      { name: 'gsm8k', sampleSize: 10 },
      { name: 'truthfulqa', sampleSize: 10 },
      { name: 'gpqa', sampleSize: 10 },
      { name: 'hle', sampleSize: 10 },
      { name: 'math500', sampleSize: 10 },
      { name: 'mmlu_pro', sampleSize: 10 },
      { name: 'simpleqa', sampleSize: 10 },
      { name: 'arc', sampleSize: 10 },
      { name: 'hellaswag', sampleSize: 10 },
      { name: 'hallumix', sampleSize: 10 },
    ]);
  });

  it('uses 3 cheap models', () => {
    expect(CI_TIER_CONFIG.models).toHaveLength(3);

    const modelIds = CI_TIER_CONFIG.models.map((m) => m.model);
    expect(modelIds).toContain('gpt-4o-mini');
    expect(modelIds).toContain('claude-3-haiku-20240307');
    expect(modelIds).toContain('gemini-1.5-flash');
  });

  it('assigns correct providers to models', () => {
    const byModel = Object.fromEntries(CI_TIER_CONFIG.models.map((m) => [m.model, m.provider]));
    expect(byModel['gpt-4o-mini']).toBe('openai');
    expect(byModel['claude-3-haiku-20240307']).toBe('anthropic');
    expect(byModel['gemini-1.5-flash']).toBe('google');
  });

  it('evaluates all 4 strategies', () => {
    expect(CI_TIER_CONFIG.strategies).toEqual(['standard', 'elo', 'majority', 'council']);
  });

  it('runs 3 times for median stability', () => {
    expect(CI_TIER_CONFIG.runs).toBe(3);
  });

  it('has 200ms request stagger', () => {
    expect(CI_TIER_CONFIG.requestDelayMs).toBe(200);
  });

  it('uses p < 0.10 significance threshold', () => {
    expect(CI_TIER_CONFIG.significanceThreshold).toBe(0.1);
  });

  it('uses gpt-4o-mini as summarizer', () => {
    expect(CI_TIER_CONFIG.summarizer).toEqual({ provider: 'openai', model: 'gpt-4o-mini' });
  });

  it('satisfies the TierConfig type', () => {
    const config: TierConfig = CI_TIER_CONFIG;
    expect(config).toBeDefined();
  });
});

describe('POST_MERGE_TIER_CONFIG', () => {
  it('has name "post-merge"', () => {
    expect(POST_MERGE_TIER_CONFIG.name).toBe('post-merge');
  });

  it('includes 600 questions across 10 datasets', () => {
    expect(POST_MERGE_TIER_CONFIG.datasets).toEqual([
      { name: 'gsm8k', sampleSize: 100 },
      { name: 'truthfulqa', sampleSize: 100 },
      { name: 'gpqa', sampleSize: 50 },
      { name: 'hle', sampleSize: 50 },
      { name: 'math500', sampleSize: 50 },
      { name: 'mmlu_pro', sampleSize: 50 },
      { name: 'simpleqa', sampleSize: 50 },
      { name: 'arc', sampleSize: 50 },
      { name: 'hellaswag', sampleSize: 50 },
      { name: 'hallumix', sampleSize: 50 },
    ]);
  });

  it('uses 4 full models', () => {
    expect(POST_MERGE_TIER_CONFIG.models).toHaveLength(4);

    const modelIds = POST_MERGE_TIER_CONFIG.models.map((m) => m.model);
    expect(modelIds).toContain('gpt-4o');
    expect(modelIds).toContain('claude-3.5-sonnet');
    expect(modelIds).toContain('gemini-1.5-pro');
    expect(modelIds).toContain('grok-2');
  });

  it('assigns correct providers to models', () => {
    const byModel = Object.fromEntries(
      POST_MERGE_TIER_CONFIG.models.map((m) => [m.model, m.provider]),
    );
    expect(byModel['gpt-4o']).toBe('openai');
    expect(byModel['claude-3.5-sonnet']).toBe('anthropic');
    expect(byModel['gemini-1.5-pro']).toBe('google');
    expect(byModel['grok-2']).toBe('xai');
  });

  it('evaluates all 4 strategies', () => {
    expect(POST_MERGE_TIER_CONFIG.strategies).toEqual(['standard', 'elo', 'majority', 'council']);
  });

  it('runs once (deterministic with temperature=0)', () => {
    expect(POST_MERGE_TIER_CONFIG.runs).toBe(1);
  });

  it('has 500ms request stagger', () => {
    expect(POST_MERGE_TIER_CONFIG.requestDelayMs).toBe(500);
  });

  it('uses p < 0.05 significance threshold', () => {
    expect(POST_MERGE_TIER_CONFIG.significanceThreshold).toBe(0.05);
  });

  it('uses gpt-4o as summarizer', () => {
    expect(POST_MERGE_TIER_CONFIG.summarizer).toEqual({ provider: 'openai', model: 'gpt-4o' });
  });

  it('satisfies the TierConfig type', () => {
    const config: TierConfig = POST_MERGE_TIER_CONFIG;
    expect(config).toBeDefined();
  });
});

describe('HOMOGENEOUS_CI_TIER_CONFIG', () => {
  it('has name "homogeneous-ci"', () => {
    expect(HOMOGENEOUS_CI_TIER_CONFIG.name).toBe('homogeneous-ci');
  });

  it('uses 3 identical Google Gemini Flash models', () => {
    expect(HOMOGENEOUS_CI_TIER_CONFIG.models).toHaveLength(3);
    for (const model of HOMOGENEOUS_CI_TIER_CONFIG.models) {
      expect(model.provider).toBe('google');
      expect(model.model).toBe('gemini-2.5-flash');
    }
  });

  it('uses the same model as summarizer', () => {
    expect(HOMOGENEOUS_CI_TIER_CONFIG.summarizer).toEqual({
      provider: 'google',
      model: 'gemini-2.5-flash',
    });
  });

  it('includes 100 questions across 10 datasets', () => {
    const total = HOMOGENEOUS_CI_TIER_CONFIG.datasets.reduce(
      (sum, d) => sum + d.sampleSize,
      0,
    );
    expect(total).toBe(100);
  });

  it('evaluates all 4 strategies', () => {
    expect(HOMOGENEOUS_CI_TIER_CONFIG.strategies).toEqual(['standard', 'elo', 'majority', 'council']);
  });

  it('has 3 runs for stability', () => {
    expect(HOMOGENEOUS_CI_TIER_CONFIG.runs).toBe(3);
  });

  it('satisfies the TierConfig type', () => {
    const config: TierConfig = HOMOGENEOUS_CI_TIER_CONFIG;
    expect(config).toBeDefined();
  });
});

describe('HOMOGENEOUS_POST_MERGE_TIER_CONFIG', () => {
  it('has name "homogeneous-post-merge"', () => {
    expect(HOMOGENEOUS_POST_MERGE_TIER_CONFIG.name).toBe('homogeneous-post-merge');
  });

  it('uses 3 identical Google Gemini Flash models', () => {
    expect(HOMOGENEOUS_POST_MERGE_TIER_CONFIG.models).toHaveLength(3);
    for (const model of HOMOGENEOUS_POST_MERGE_TIER_CONFIG.models) {
      expect(model.provider).toBe('google');
      expect(model.model).toBe('gemini-2.5-flash');
    }
  });

  it('includes 500 questions across 10 datasets', () => {
    const total = HOMOGENEOUS_POST_MERGE_TIER_CONFIG.datasets.reduce(
      (sum, d) => sum + d.sampleSize,
      0,
    );
    expect(total).toBe(500);
  });

  it('runs once (deterministic)', () => {
    expect(HOMOGENEOUS_POST_MERGE_TIER_CONFIG.runs).toBe(1);
  });

  it('satisfies the TierConfig type', () => {
    const config: TierConfig = HOMOGENEOUS_POST_MERGE_TIER_CONFIG;
    expect(config).toBeDefined();
  });
});

describe('getTierConfig', () => {
  it('returns CI config for "ci" tier', () => {
    expect(getTierConfig('ci')).toBe(CI_TIER_CONFIG);
  });

  it('returns post-merge config for "post-merge" tier', () => {
    expect(getTierConfig('post-merge')).toBe(POST_MERGE_TIER_CONFIG);
  });

  it('returns homogeneous-ci config', () => {
    expect(getTierConfig('homogeneous-ci')).toBe(HOMOGENEOUS_CI_TIER_CONFIG);
  });

  it('returns homogeneous-post-merge config', () => {
    expect(getTierConfig('homogeneous-post-merge')).toBe(HOMOGENEOUS_POST_MERGE_TIER_CONFIG);
  });

  it('throws on invalid tier name', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getTierConfig('invalid' as any)).toThrow('Unknown tier: "invalid"');
  });
});
