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

  it('reads call, consensus and question limits and retries, with defaults', () => {
    expect(parseMatrixConfig(committed)).toMatchObject({
      callTimeoutMs: 180_000, consensusTimeoutMs: 300_000, questionTimeoutMs: 900_000, maxRetries: 4,
    });
    const { callTimeoutMs: _c, consensusTimeoutMs: _s, questionTimeoutMs: _q, maxRetries: _r, ...bare } = committed;
    expect(parseMatrixConfig(bare)).toMatchObject({
      callTimeoutMs: 180_000, consensusTimeoutMs: 300_000, questionTimeoutMs: 900_000, maxRetries: 4,
    });
  });

  it('rejects a question limit shorter than one call plus the consensus', () => {
    expect(() => parseMatrixConfig({ ...committed, questionTimeoutMs: 300_000 })).toThrow(/questionTimeoutMs/);
  });

  it('reads per-model OpenRouter routing and requireParameters, with an override', () => {
    const models = committed.models as Array<Record<string, unknown>>;
    const config = parseMatrixConfig({
      ...committed,
      requireParameters: false,
      reference: { ...(committed.reference as object), routing: { ignore: ['HostB'] } },
      models: [{ ...models[0], routing: { order: ['HostA'] } }, ...models.slice(1)],
    });
    expect(config.requireParameters).toBe(false);
    expect(config.reference.routing).toEqual({ ignore: ['HostB'] });
    expect(config.models[0]!.routing).toEqual({ order: ['HostA'] });
    expect(parseMatrixConfig(committed).requireParameters).toBe(true);
    expect(parseMatrixConfig(committed, { requireParameters: false }).requireParameters).toBe(false);
    expect(() => parseMatrixConfig({ ...committed, requireParameters: 'yes' })).toThrow(/requireParameters/);
    expect(() => parseMatrixConfig({ ...committed, reference: { ...(committed.reference as object), routing: ['x'] } })).toThrow(/routing/);
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
