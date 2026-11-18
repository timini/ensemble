import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

vi.mock('../lib/matrix/runner.js', () => ({
  runMatrix: vi.fn().mockResolvedValue({ estimate: { calls: 0 }, ran: false, summary: null }),
}));

import { runMatrix } from '../lib/matrix/runner.js';
import { createMatrixCommand, DEFAULT_PUBLISH_PATH, DEFAULT_RESULTS_DIR } from './matrix.js';

const run = (args: string[]) => createMatrixCommand().parseAsync(args, { from: 'user' });

describe('matrix command', () => {
  beforeEach(() => vi.mocked(runMatrix).mockClear());

  it('reads the committed config, defaults to free mode and does not confirm spending', async () => {
    await run([]);
    const options = vi.mocked(runMatrix).mock.calls[0]![0];
    expect(options.mode).toBe('free');
    expect(options.yes).toBe(false);
    expect(options.config.datasets).toHaveLength(4);
    expect(options.resultsDir).toBe(DEFAULT_RESULTS_DIR);
    expect(options.runId).toMatch(/^\d{4}-\d{2}-\d{2}-m3-matrix$/);
    expect(options.publishPath).toBeUndefined();
  });

  it('passes --yes, --run-id, overrides and --publish', async () => {
    await run([
      '--yes', '--run-id', 'r1', '--mode', 'mock', '--sample', '5', '--datasets', 'gsm8k,gpqa',
      '--results-dir', '/tmp/x', '--publish', '/tmp/x/summary.json', '--concurrency', '2', '--force',
    ]);
    const options = vi.mocked(runMatrix).mock.calls[0]![0];
    expect(options).toMatchObject({ yes: true, runId: 'r1', mode: 'mock', resultsDir: resolve('/tmp/x'), concurrency: 2, force: true });
    expect(options.config.sample).toBe(5);
    expect(options.config.datasets).toEqual(['gsm8k', 'gpqa']);
    expect(options.publishPath).toBe(resolve('/tmp/x/summary.json'));
  });

  it('passes --retry-failed', async () => {
    await run(['--run-id', '2026-11-17-m3-matrix', '--retry-failed', '--yes']);
    expect(vi.mocked(runMatrix).mock.calls[0]![0]).toMatchObject({ retryFailed: true, runId: '2026-11-17-m3-matrix' });
  });

  it('passes --allow-config-change, off by default', async () => {
    await run([]);
    expect(vi.mocked(runMatrix).mock.calls[0]![0].allowConfigChange).toBeUndefined();
    await run(['--run-id', 'r1', '--allow-config-change']);
    expect(vi.mocked(runMatrix).mock.calls[1]![0]).toMatchObject({ allowConfigChange: true });
  });

  it('keeps require_parameters on by default and turns it off with --no-require-parameters', async () => {
    await run([]);
    expect(vi.mocked(runMatrix).mock.calls[0]![0].config.requireParameters).toBe(true);
    await run(['--retry-failed', '--no-require-parameters']);
    expect(vi.mocked(runMatrix).mock.calls[1]![0].config.requireParameters).toBe(false);
  });

  it('publishes a free run to the app summary', async () => {
    await run(['--publish']);
    expect(vi.mocked(runMatrix).mock.calls[0]![0].publishPath).toBe(DEFAULT_PUBLISH_PATH);
  });

  it('never publishes a mock run to the app summary', async () => {
    await expect(run(['--mode', 'mock', '--publish'])).rejects.toThrow(/never published/);
    await expect(run(['--mode', 'mock', '--publish', DEFAULT_PUBLISH_PATH])).rejects.toThrow(/never published/);
    expect(runMatrix).not.toHaveBeenCalled();
  });

  it('rejects an unknown mode', async () => {
    await expect(run(['--mode', 'pro'])).rejects.toThrow(/mode/);
  });
});
