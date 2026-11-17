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
      '--results-dir', '/tmp/x', '--publish', '--concurrency', '2',
    ]);
    const options = vi.mocked(runMatrix).mock.calls[0]![0];
    expect(options).toMatchObject({ yes: true, runId: 'r1', mode: 'mock', resultsDir: resolve('/tmp/x'), concurrency: 2 });
    expect(options.config.sample).toBe(5);
    expect(options.config.datasets).toEqual(['gsm8k', 'gpqa']);
    expect(options.publishPath).toBe(DEFAULT_PUBLISH_PATH);
  });

  it('rejects an unknown mode', async () => {
    await expect(run(['--mode', 'pro'])).rejects.toThrow(/mode/);
  });
});
