import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BenchmarkResultsFile, PromptRunResult } from '../types.js';
import { createCalibrateAgreementCommand } from './calibrateAgreement.js';
import { createCalibrateTokensCommand } from './calibrateTokens.js';

const LETTERS = ['A', 'B', 'C'];

/** 12 questions, 3 models. Model 0 and 1 agree on even questions; model 2 always differs. */
function ensembleFile(): BenchmarkResultsFile {
  const runs: PromptRunResult[] = Array.from({ length: 12 }, (_, q) => {
    const predicted = ['A', q % 2 === 0 ? 'A' : 'B', LETTERS[(q % 2) + 1]!];
    return {
      questionId: `q${q}`,
      prompt: `Question ${q}`,
      consensus: {},
      consensusMetrics: { standard: { tokenCount: 0, durationMs: 0, inputTokens: 900, outputTokens: 300, calls: 1 } },
      responses: predicted.map((p, i) => ({
        provider: 'openai-compatible' as const,
        model: `ollama/m${i}`,
        content: `Reasoning for question ${q} by model ${i}.\nFinal answer: ${p}`,
        responseTimeMs: 1,
        usage: { inputTokens: 100, outputTokens: 200 + q * 10 + i, source: 'reported' as const },
      })),
      evaluation: {
        evaluator: 'mcq', groundTruth: 'A', accuracy: 0,
        results: Object.fromEntries(predicted.map((p, i) => [
          `openai-compatible:ollama/m${i}`, { correct: p === 'A', expected: 'A', predicted: p },
        ])),
      },
    };
  });
  return {
    type: 'benchmark', dataset: 'gpqa', mode: 'mock', models: [], strategies: ['standard'],
    sampleSize: 12, createdAt: '', updatedAt: '', runs,
  };
}

let dir: string;
let output: string;
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'calibrate-'));
  mkdirSync(join(dir, 'run/gpqa'), { recursive: true });
  writeFileSync(join(dir, 'run/gpqa/ensemble.json'), JSON.stringify(ensembleFile()));
  output = join(dir, 'out.json');
  stdout.mockClear();
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

const printed = () => stdout.mock.calls.map((c) => String(c[0])).join('');

describe('calibrate-agreement', () => {
  it('prints the embedding count and spends nothing in free mode without --yes', async () => {
    await createCalibrateAgreementCommand().parseAsync(
      ['--results', join(dir, 'run'), '--embedding', 'ollama:nomic-embed-text', '--output', output],
      { from: 'user' },
    );
    expect(printed()).toMatch(/36 answer pairs, 36 texts to embed/);
    expect(printed()).toMatch(/--yes/);
    expect(existsSync(output)).toBe(false);
  });

  it('fits thresholds in mock mode, caches the scored pairs and writes the calibration', async () => {
    const args = ['--results', join(dir, 'run'), '--embedding', 'openai:text-embedding-3-small', '--mode', 'mock', '--output', output];
    await createCalibrateAgreementCommand().parseAsync(args, { from: 'user' });
    const file = JSON.parse(readFileSync(output, 'utf8'));
    const entry = file.models['openai/text-embedding-3-small'];
    expect(file.schemaVersion).toBe(1);
    expect(entry).toMatchObject({ pairs: 36, agreePairs: 6, disagreePairs: 30 });
    expect(entry.high).toBeGreaterThanOrEqual(entry.medium);
    expect(existsSync(join(dir, 'run/calibration/openai_text-embedding-3-small-mock-pairs.json'))).toBe(true);

    await createCalibrateAgreementCommand().parseAsync(args, { from: 'user' });
    expect(printed()).toMatch(/Using 36 scored pairs/);
  });

  it('refuses an embedding model the app does not use', async () => {
    await expect(createCalibrateAgreementCommand().parseAsync(
      ['--results', join(dir, 'run'), '--embedding', 'openai:text-embedding-3-large', '--mode', 'mock'],
      { from: 'user' },
    )).rejects.toThrow(/embeds with openai:text-embedding-3-small/);
  });
});

describe('calibrate-tokens', () => {
  it('writes the token calibration module from recorded usage', async () => {
    const out = join(dir, 'tokenCalibration.ts');
    await createCalibrateTokensCommand().parseAsync(['--results', join(dir, 'run'), '--output', out], { from: 'user' });
    const source = readFileSync(out, 'utf8');
    expect(source).toMatch(/"answer": \{\s+"low": \d+,\s+"high": \d+/);
    expect(source).toMatch(/"calls": 48/);
  });
});
