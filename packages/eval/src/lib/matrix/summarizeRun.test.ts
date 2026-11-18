import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { writeJsonFile } from '../io.js';
import type { BenchmarkResultsFile } from '../../types.js';
import { parseMatrixConfig, resultKeyOf } from './config.js';
import { summarizeRun } from './summarizeRun.js';

const rawConfig = {
  ...JSON.parse(readFileSync(resolve(__dirname, '../../../bench/matrix.json'), 'utf8')),
  datasets: ['gsm8k'],
};
const config = parseMatrixConfig(rawConfig);

function ensembleFile(): BenchmarkResultsFile {
  return {
    type: 'benchmark', dataset: 'gsm8k', mode: 'free', models: [], strategies: ['majority', 'standard'],
    sampleSize: 2, createdAt: '', updatedAt: '',
    runs: [0, 1].map((i) => ({
      questionId: `q${i}`, prompt: `p${i}`, consensus: {},
      responses: config.models.map((m) => ({
        provider: m.parsed.provider, model: m.parsed.model, content: 'x', responseTimeMs: 1, estimatedCostUsd: 0.001,
      })),
      evaluation: {
        evaluator: 'numeric', groundTruth: '1', accuracy: 0,
        results: Object.fromEntries(config.models.map((m) => [resultKeyOf(m), { correct: i === 0, expected: '1', predicted: '1' }])),
      },
      consensusEvaluation: {
        evaluator: 'numeric', groundTruth: '1',
        results: { majority: { correct: true, expected: '1', predicted: '1' }, standard: { correct: true, expected: '1', predicted: '1' } },
      },
    })),
  };
}

describe('summarizeRun', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'summarize-run-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function writeRun(mode: 'free' | 'mock') {
    await writeJsonFile(join(dir, 'r1', 'manifest.json'), { runId: 'r1', mode, status: 'running', config: rawConfig });
    await writeJsonFile(join(dir, 'r1', 'gsm8k', 'ensemble.json'), ensembleFile());
  }

  it('builds the summary from the results files, with no estimate, and publishes it', async () => {
    await writeRun('free');
    const publishPath = join(dir, 'app.json');
    const summary = await summarizeRun({
      resultsDir: dir, runId: 'r1', publishPath, log: () => {}, now: () => new Date('2026-11-18T00:00:00Z'),
    });
    expect(summary).toMatchObject({ runId: 'r1', mode: 'free', status: 'partial', estimate: null });
    expect(summary.datasets[0]!.rows.find((r) => r.id === 'ensemble:majority')).toMatchObject({ n: 2, correct: 2 });
    expect(JSON.parse(await readFile(join(dir, 'r1', 'summary.json'), 'utf8'))).toEqual(summary);
    expect(JSON.parse(await readFile(publishPath, 'utf8'))).toEqual(summary);
  });

  it('refuses a run with no manifest', async () => {
    await expect(summarizeRun({ resultsDir: dir, runId: 'missing', log: () => {} })).rejects.toThrow(/No manifest/);
  });

  it('never publishes a mock run to the app summary', async () => {
    await writeRun('mock');
    const app = join(dir, 'app.json');
    await expect(summarizeRun({ resultsDir: dir, runId: 'r1', publishPath: app, appSummaryPath: app, log: () => {} }))
      .rejects.toThrow(/never published/);
  });
});
