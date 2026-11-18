import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseMatrixConfig } from './config.js';
import { isFailedRun, runMatrix } from './runner.js';
import type { BenchmarkResultsFile, PromptRunResult } from '../../types.js';
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

  it('with retryFailed, runs again only the failed or empty entries and keeps the rest', async () => {
    await runMatrix({ ...base(), mode: 'mock', yes: false });
    const runDir = join(dir, 'results/test-run');
    const ensemblePath = join(runDir, 'gsm8k/ensemble.json');
    const cacheDir = join(dir, 'results/cache/mock/reference');
    const cachePath = join(cacheDir, readdirSync(cacheDir)[0]!);
    const [referencePath] = readdirSync(cachePath).map((f) => join(cachePath, f));

    const ensemble = JSON.parse(readFileSync(ensemblePath, 'utf8')) as BenchmarkResultsFile;
    ensemble.runs[0]!.responses[1] = { ...ensemble.runs[0]!.responses[1]!, content: '', error: 'OpenAI-compatible API error: fetch failed' };
    (ensemble.runs[1] as PromptRunResult & { marker?: string }).marker = 'kept';
    writeFileSync(ensemblePath, JSON.stringify(ensemble));
    const reference = JSON.parse(readFileSync(referencePath!, 'utf8')) as BenchmarkResultsFile;
    reference.runs[2]!.responses[0] = { ...reference.runs[2]!.responses[0]!, content: '', usage: { inputTokens: 163, outputTokens: 0, source: 'reported' } };
    writeFileSync(referencePath!, JSON.stringify(reference));
    const keptResponse = ensemble.runs[0]!.responses[0]!;

    const plan = await runMatrix({ ...base(), mode: 'mock', yes: false, retryFailed: true, planOnly: true });
    expect(plan.estimate.jobs.map((j) => j.pending)).toEqual([1, 1]);
    expect(lines).toContain('gsm8k ensemble: 1 failed entry to run again.');
    expect(lines).toContain('gsm8k reference: 1 failed entry to run again.');

    const result = await runMatrix({ ...base(), mode: 'mock', yes: false, retryFailed: true });
    expect(result.summary?.status).toBe('complete');
    const repaired = JSON.parse(readFileSync(ensemblePath, 'utf8')) as BenchmarkResultsFile;
    expect(repaired.runs).toHaveLength(3);
    expect(repaired.runs.some(isFailedRun)).toBe(false);
    expect((repaired.runs.find((r) => r.questionId === ensemble.runs[1]!.questionId) as { marker?: string }).marker).toBe('kept');
    const rerun = repaired.runs.find((r) => r.questionId === ensemble.runs[0]!.questionId)!;
    expect(rerun.responses[0]).toEqual(keptResponse);
    expect(rerun.responses[1]!.error).toBeUndefined();
    const repairedReference = JSON.parse(readFileSync(join(runDir, 'gsm8k/reference.json'), 'utf8')) as BenchmarkResultsFile;
    expect(repairedReference.runs.some(isFailedRun)).toBe(false);
    expect(lines.join('\n')).toMatch(/1 failed entry to run again/);
  }, 30_000);

  it('an interrupted retryFailed pass leaves the failed entries not yet rerun in the file', async () => {
    await runMatrix({ ...base(), mode: 'mock', yes: false });
    const runDir = join(dir, 'results/test-run');
    const ensemblePath = join(runDir, 'gsm8k/ensemble.json');
    const ensemble = JSON.parse(readFileSync(ensemblePath, 'utf8')) as BenchmarkResultsFile;
    for (const run of ensemble.runs.slice(0, 2)) {
      run.responses[1] = { ...run.responses[1]!, content: '', error: 'OpenAI-compatible API error: fetch failed' };
    }
    writeFileSync(ensemblePath, JSON.stringify(ensemble));
    const secondFailed = ensemble.runs[1]!;

    const interrupt = (line: string) => {
      lines.push(line);
      if (/gsm8k ensemble: 1\/2/.test(line)) throw new Error('interrupted');
    };
    await expect(runMatrix({ ...base(), log: interrupt, mode: 'mock', yes: false, retryFailed: true, concurrency: 1 }))
      .rejects.toThrow(/interrupted/);

    const after = JSON.parse(readFileSync(ensemblePath, 'utf8')) as BenchmarkResultsFile;
    expect(after.runs).toHaveLength(3);
    const first = after.runs.find((r) => r.questionId === ensemble.runs[0]!.questionId)!;
    expect(isFailedRun(first)).toBe(false);
    // The second failed entry was not rerun yet: it is still there, usable answers included.
    const second = after.runs.find((r) => r.questionId === secondFailed.questionId)!;
    expect(second.responses).toEqual(secondFailed.responses);
    expect(isFailedRun(second)).toBe(true);

    // The next repair pass picks it up.
    await runMatrix({ ...base(), mode: 'mock', yes: false, retryFailed: true });
    const repaired = JSON.parse(readFileSync(ensemblePath, 'utf8')) as BenchmarkResultsFile;
    expect(repaired.runs.some(isFailedRun)).toBe(false);
    expect(repaired.runs.find((r) => r.questionId === secondFailed.questionId)!.responses[0]).toEqual(secondFailed.responses[0]);
  }, 30_000);

  it('records the routing a run started with and the routing of each repair in the manifest', async () => {
    // bench/matrix.json routes the reference model around one host.
    const models = { reference: { ignore: ['claude-on-aws'] } };
    await runMatrix({ ...base(), mode: 'mock', yes: false });
    const manifestPath = join(dir, 'results/test-run/manifest.json');
    expect(JSON.parse(readFileSync(manifestPath, 'utf8')).routing).toEqual({ requireParameters: true, models });
    const repairConfig = parseMatrixConfig(raw, { datasets: ['gsm8k'], sample: 3, requireParameters: false });
    await runMatrix({ ...base(), config: repairConfig, mode: 'mock', yes: false, retryFailed: true });
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { routing: unknown; repairs: { routing: unknown }[] };
    expect(manifest.routing).toEqual({ requireParameters: true, models });
    expect(manifest.repairs).toHaveLength(1);
    expect(manifest.repairs[0]!.routing).toEqual({ requireParameters: false, models });
  }, 30_000);

  it('refuses to resume a run id whose result-affecting settings changed', async () => {
    await runMatrix({ ...base(), mode: 'mock', yes: false });
    const ensemblePath = join(dir, 'results/test-run/gsm8k/ensemble.json');
    const before = readFileSync(ensemblePath, 'utf8');
    const changed = parseMatrixConfig(
      { ...raw, optionSeed: 7, temperature: 0.5, summarizer: 'llama' },
      { datasets: ['gsm8k'], sample: 3 },
    );
    await expect(runMatrix({ ...base(), config: changed, mode: 'mock', yes: false }))
      .rejects.toThrow(/optionSeed.*temperature.*summarizer|allow-config-change/s);
    await expect(runMatrix({ ...base(), config: changed, mode: 'mock', yes: false, planOnly: true }))
      .rejects.toThrow(/optionSeed/);
    const protocol = parseMatrixConfig({ ...raw, protocol: 'legacy' }, { datasets: ['gsm8k'], sample: 3 });
    await expect(runMatrix({ ...base(), config: protocol, mode: 'mock', yes: false })).rejects.toThrow(/protocol/);
    expect(readFileSync(ensemblePath, 'utf8')).toBe(before);
  }, 30_000);

  it('resumes a run id whose maxOutputTokens changed without allowConfigChange', async () => {
    // A run started before the field existed: its stored config has no maxOutputTokens.
    const { maxOutputTokens: _omitted, ...older } = raw as Record<string, unknown>;
    const olderConfig = parseMatrixConfig(older, { datasets: ['gsm8k'], sample: 3 });
    await runMatrix({ ...base(), config: olderConfig, rawConfig: older, mode: 'mock', yes: false });
    const changed = parseMatrixConfig({ ...raw, maxOutputTokens: 1024 }, { datasets: ['gsm8k'], sample: 3 });
    const result = await runMatrix({ ...base(), config: changed, mode: 'mock', yes: false, retryFailed: true });
    expect(result.ran).toBe(true);
    expect(lines.join('\n')).not.toMatch(/changed settings/);
  }, 30_000);

  it('resumes a changed run id with allowConfigChange and records the change in the manifest', async () => {
    await runMatrix({ ...base(), mode: 'mock', yes: false });
    const changed = parseMatrixConfig({ ...raw, optionSeed: 7 }, { datasets: ['gsm8k'], sample: 3 });
    const result = await runMatrix({ ...base(), config: changed, mode: 'mock', yes: false, allowConfigChange: true });
    expect(result.ran).toBe(true);
    const manifest = JSON.parse(readFileSync(join(dir, 'results/test-run/manifest.json'), 'utf8')) as {
      experiment: { optionSeed: number }; configChanges: { fields: string[] }[];
    };
    expect(manifest.experiment.optionSeed).toBe(1729);
    expect(manifest.configChanges).toHaveLength(1);
    expect(manifest.configChanges[0]!.fields).toEqual(['optionSeed']);
    expect(lines.join('\n')).toMatch(/optionSeed/);
  }, 30_000);

  it('checks a run made before the settings were recorded against its stored config', async () => {
    await runMatrix({ ...base(), mode: 'mock', yes: false });
    const manifestPath = join(dir, 'results/test-run/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    delete manifest.experiment;
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const changed = parseMatrixConfig({ ...raw, temperature: 1 }, { datasets: ['gsm8k'], sample: 3 });
    await expect(runMatrix({ ...base(), config: changed, mode: 'mock', yes: false })).rejects.toThrow(/temperature/);
    // An unchanged config and a routing-only repair still resume.
    const repair = parseMatrixConfig(raw, { datasets: ['gsm8k'], sample: 3, requireParameters: false });
    await expect(runMatrix({ ...base(), config: repair, mode: 'mock', yes: false, retryFailed: true })).resolves.toMatchObject({ ran: true });
  }, 30_000);

  it('isFailedRun spots errors, empty answers and failed consensus', () => {
    const ok = {
      prompt: 'p', questionId: 'q', consensus: {},
      responses: [{ provider: 'openai', model: 'm', content: 'Final answer: 4', responseTimeMs: 1 }],
    } as PromptRunResult;
    expect(isFailedRun(ok)).toBe(false);
    expect(isFailedRun({ ...ok, failure: 'timeout' })).toBe(true);
    expect(isFailedRun({ ...ok, responses: [{ ...ok.responses[0]!, content: ' ' }] })).toBe(true);
    expect(isFailedRun({ ...ok, responses: [{ ...ok.responses[0]!, error: 'x' }] })).toBe(true);
    expect(isFailedRun({
      ...ok,
      consensusEvaluation: { evaluator: 'numeric', groundTruth: '4', results: { standard: { correct: false, expected: '4', predicted: null, failure: 'error' } } },
    })).toBe(true);
  });
});
