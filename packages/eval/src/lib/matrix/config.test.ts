import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseMatrixConfig, resultKeyOf } from './config.js';

const committed = JSON.parse(
  readFileSync(resolve(__dirname, '../../../bench/matrix.json'), 'utf8'),
) as Record<string, unknown>;

describe('parseMatrixConfig', () => {
  it('parses the committed matrix', () => {
    const config = parseMatrixConfig(committed);
    expect(config.datasets).toEqual(['gsm8k', 'mmlu_pro', 'gpqa', 'truthfulqa']);
    expect(config.models).toHaveLength(3);
    expect(config.models[0]!.parsed.provider).toBe('openai-compatible');
    expect(config.summarizer.id).toBe('qwen');
    expect(config.reference.parsed.model).toBe('openrouter/anthropic/claude-sonnet-5.5');
    expect(config.ensembleStrategies).toEqual(['majority', 'standard']);
    expect(config.protocol).toBe('structured');
  });

  it('rejects an unknown dataset, a missing summarizer and duplicate model ids', () => {
    expect(() => parseMatrixConfig({ ...committed, datasets: ['nope'] })).toThrow(/dataset/i);
    expect(() => parseMatrixConfig({ ...committed, summarizer: 'mistral' })).toThrow(/summarizer/i);
    const models = committed.models as Array<Record<string, string>>;
    expect(() => parseMatrixConfig({ ...committed, models: [models[0], models[0]] })).toThrow(/unique/i);
  });

  it('rejects a sample that is not a positive integer', () => {
    expect(() => parseMatrixConfig({ ...committed, sample: 0 })).toThrow(/sample/i);
  });

  it('applies overrides for sample and datasets', () => {
    const config = parseMatrixConfig(committed, { sample: 5, datasets: ['gsm8k'] });
    expect(config.sample).toBe(5);
    expect(config.datasets).toEqual(['gsm8k']);
  });
});

describe('resultKeyOf', () => {
  it('is the key evaluation results use for a model', () => {
    const config = parseMatrixConfig(committed);
    expect(resultKeyOf(config.models[1]!)).toBe('openai-compatible:openrouter/meta-llama/llama-3.1-8b-instruct');
  });
});
