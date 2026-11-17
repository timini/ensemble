import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { createGenerateCacheCommand } from '../commands/generateCache.js';
import { createQuickEvalCommand } from '../commands/quickEval.js';
import {
  CACHED_EVAL_MODEL,
  DEFAULT_CONSENSUS_MODEL,
  DEFAULT_JUDGE_MODEL,
  DEFAULT_SAMPLE_FREE,
  DEFAULT_SAMPLE_MOCK,
  resolveSampleSize,
  sampleSizeWarning,
} from './evalDefaults.js';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function defaultsOf(command: Command): Record<string, unknown> {
  command.action(() => { /* noop */ });
  const program = new Command();
  program.exitOverride();
  program.addCommand(command);
  program.parse(['node', 'test', command.name()], { from: 'node' });
  return command.opts();
}

function flagValue(script: string, flag: string): string | undefined {
  const match = script.match(new RegExp(`${flag}\\s+(\\S+)`));
  return match?.[1];
}

describe('eval defaults', () => {
  it('has committed ensemble and baseline caches for the default model', () => {
    const safe = CACHED_EVAL_MODEL.replace(/[/:]/g, '_');
    const ensembleFiles = readdirSync(resolve(pkgRoot, '.cache/ensemble'))
      .filter((f) => f.startsWith(`${safe}_`));
    const baselineFiles = readdirSync(resolve(pkgRoot, '.cache/baselines'))
      .filter((f) => f.startsWith(`${safe}_`));
    expect(ensembleFiles.length).toBeGreaterThan(0);
    expect(baselineFiles.length).toBeGreaterThan(0);
    expect(existsSync(resolve(pkgRoot, `.cache/ensemble/${safe}_gsm8k_5x_t0.7.json`))).toBe(true);
  });

  it('quick-eval defaults to the cached model', () => {
    const opts = defaultsOf(createQuickEvalCommand());
    expect(opts.model).toBe(CACHED_EVAL_MODEL);
    expect(opts.consensusModel).toBe(DEFAULT_CONSENSUS_MODEL);
    expect(opts.judgeModel).toBe(DEFAULT_JUDGE_MODEL);
  });

  it('generate-cache defaults to the cached model', () => {
    const opts = defaultsOf(createGenerateCacheCommand());
    expect(opts.model).toBe(CACHED_EVAL_MODEL);
    expect(opts.judgeModel).toBe(DEFAULT_JUDGE_MODEL);
  });

  it('eval:ci scripts use the same models as the defaults', () => {
    const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const ciScripts = Object.entries(pkg.scripts).filter(([name]) => name.startsWith('eval:ci'));
    expect(ciScripts.length).toBeGreaterThanOrEqual(5);
    for (const [, script] of ciScripts) {
      expect(flagValue(script, '--model')).toBe(CACHED_EVAL_MODEL);
      expect(flagValue(script, '--consensus-model')).toBe(DEFAULT_CONSENSUS_MODEL);
      expect(flagValue(script, '--judge-model')).toBe(DEFAULT_JUDGE_MODEL);
    }
  });

  it('eval:ci scripts keep the cached sample size so CI stays quick', () => {
    const pkg = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    for (const [name, script] of Object.entries(pkg.scripts)) {
      if (name.startsWith('eval:ci')) expect(flagValue(script, '--sample')).toBe('30');
    }
  });

  it('real runs default to at least 200 questions per dataset', () => {
    expect(DEFAULT_SAMPLE_FREE).toBeGreaterThanOrEqual(200);
    expect(resolveSampleSize(undefined, 'free')).toBe(DEFAULT_SAMPLE_FREE);
    expect(resolveSampleSize(undefined, 'mock')).toBe(DEFAULT_SAMPLE_MOCK);
    expect(resolveSampleSize('50', 'free')).toBe(50);
    expect(() => resolveSampleSize('0', 'free')).toThrow(/Invalid sample/);
    expect(() => resolveSampleSize('abc', 'free')).toThrow(/Invalid sample/);
  });

  it('warns about small real runs only', () => {
    expect(sampleSizeWarning(30, 'free')).toMatch(/below 200/);
    expect(sampleSizeWarning(200, 'free')).toBeNull();
    expect(sampleSizeWarning(5, 'mock')).toBeNull();
  });
});
