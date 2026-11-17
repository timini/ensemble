import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseMatrixConfig } from './config.js';
import { runMatrix } from './runner.js';
import type { MatrixSummary } from './summary.js';

const raw = JSON.parse(readFileSync(resolve(__dirname, '../../../bench/matrix.json'), 'utf8'));
const config = parseMatrixConfig(raw, { datasets: ['gsm8k'], sample: 3 });
let dir: string;
let previousDatasetsDir: string | undefined;
const lines: string[] = [];
const base = () => ({
  config, rawConfig: raw, resultsDir: join(dir, 'results'), runId: 'test-run', skipDownload: true,
  log: (line: string) => lines.push(line), now: () => new Date('2026-11-17T12:00:00Z'),
});

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'matrix-'));
  previousDatasetsDir = process.env.ENSEMBLE_EVAL_DATASETS_DIR;
  process.env.ENSEMBLE_EVAL_DATASETS_DIR = join(dir, 'datasets');
  mkdirSync(join(dir, 'datasets'));
  copyFileSync(resolve(__dirname, '__fixtures__/gsm8k.json'), join(dir, 'datasets/gsm8k.json'));
  lines.length = 0;
});

afterEach(() => {
  if (previousDatasetsDir === undefined) delete process.env.ENSEMBLE_EVAL_DATASETS_DIR;
  else process.env.ENSEMBLE_EVAL_DATASETS_DIR = previousDatasetsDir;
  rmSync(dir, { recursive: true, force: true });
});

describe('runMatrix', () => {
  it('prints the estimate and spends nothing in free mode without --yes', async () => {
    const result = await runMatrix({ ...base(), mode: 'free', yes: false });
    expect(result.ran).toBe(false);
    expect(result.estimate.calls).toBe(3 * 4 + 3);
    expect(lines.join('\n')).toMatch(/Cost estimate/);
    expect(lines.join('\n')).toMatch(/--yes/);
    expect(existsSync(join(dir, 'results'))).toBe(false);
  });

  it('publishes a not-run summary with --plan-only', async () => {
    const publishPath = join(dir, 'app/summary.json');
    await runMatrix({ ...base(), mode: 'free', yes: false, planOnly: true, publishPath });
    const summary = JSON.parse(readFileSync(publishPath, 'utf8')) as MatrixSummary;
    expect(summary.status).toBe('not-run');
    expect(summary.estimate?.calls).toBe(15);
  });

  it('keeps a published summary that holds results unless forced', async () => {
    const publishPath = join(dir, 'app/summary.json');
    mkdirSync(join(dir, 'app'));
    const published = JSON.stringify({ schemaVersion: 1, status: 'complete', datasets: [{}] });
    writeFileSync(publishPath, published);
    await runMatrix({ ...base(), mode: 'free', yes: false, planOnly: true, publishPath });
    expect(readFileSync(publishPath, 'utf8')).toBe(published);
    expect(lines.join('\n')).toMatch(/holds results.*--force/);

    await runMatrix({ ...base(), mode: 'free', yes: false, planOnly: true, publishPath, force: true });
    expect((JSON.parse(readFileSync(publishPath, 'utf8')) as MatrixSummary).status).toBe('not-run');
  });

  it('runs end to end in mock mode, writes the documented layout and resumes from it', async () => {
    const publishPath = join(dir, 'app/summary.json');
    const first = await runMatrix({ ...base(), mode: 'mock', yes: false, publishPath });
    expect(first.ran).toBe(true);
    const runDir = join(dir, 'results/test-run');
    for (const file of ['manifest.json', 'summary.json', 'gsm8k/ensemble.json', 'gsm8k/reference.json']) {
      expect(existsSync(join(runDir, file))).toBe(true);
    }
    expect(existsSync(join(dir, 'results/cache/mock/reference'))).toBe(true);
    expect(first.summary?.status).toBe('complete');
    expect(first.summary?.datasets[0]?.rows).toHaveLength(6);
    const manifest = JSON.parse(readFileSync(join(runDir, 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({ runId: 'test-run', mode: 'mock', status: 'complete' });

    const second = await runMatrix({ ...base(), mode: 'mock', yes: false });
    expect(second.estimate.calls).toBe(0);

    // A new run id reuses the cached reference answers.
    const third = await runMatrix({ ...base(), runId: 'other', mode: 'mock', yes: false, planOnly: true });
    expect(third.estimate.jobs.find((j) => j.kind === 'reference')?.pending).toBe(0);
    expect(third.estimate.jobs.find((j) => j.kind === 'ensemble')?.pending).toBe(3);
  }, 30_000);
});
