import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { createQuickEvalCommand } from './quickEval.js';

/**
 * Wrap the quick-eval command in a parent program so we can parse args
 * without triggering the action handler (which needs API keys).
 */
function parseOpts(args: string[]) {
  const program = new Command();
  program.exitOverride();

  const quickEval = createQuickEvalCommand();
  // Remove the action so parse doesn't execute it
  quickEval.action(() => { /* noop */ });
  program.addCommand(quickEval);

  program.parse(['node', 'test', 'quick-eval', ...args], { from: 'node' });
  return quickEval.opts();
}

describe('quickEval', () => {
  it('creates a commander command with expected name', () => {
    const cmd = createQuickEvalCommand();
    expect(cmd.name()).toBe('quick-eval');
  });

  it('has default option values', () => {
    const opts = parseOpts([]);
    expect(opts.model).toBe('google:gemini-2.5-flash-lite');
    expect(opts.judgeModel).toBe('google:gemini-2.5-flash');
    expect(opts.ensemble).toBe('5');
    expect(opts.temperature).toBe('0.7');
    expect(opts.sample).toBe('50');
    expect(opts.mode).toBe('free');
    expect(opts.cache).toBe(true);
    expect(opts.parallel).toBe(true);
    expect(opts.concurrency).toBe('50');
  });

  it('parses custom options', () => {
    const opts = parseOpts([
      '--model', 'openai:gpt-4o',
      '--ensemble', '5',
      '--sample', '20',
      '--mode', 'mock',
      '--no-cache',
      '--no-parallel',
    ]);
    expect(opts.model).toBe('openai:gpt-4o');
    expect(opts.ensemble).toBe('5');
    expect(opts.sample).toBe('20');
    expect(opts.mode).toBe('mock');
    expect(opts.cache).toBe(false);
    expect(opts.parallel).toBe(false);
  });

  it('accepts strategies option', () => {
    const opts = parseOpts(['--strategies', 'elo,majority']);
    expect(opts.strategies).toEqual(['elo,majority']);
  });

  it('accepts datasets option', () => {
    const opts = parseOpts(['--datasets', 'gsm8k,gpqa']);
    expect(opts.datasets).toEqual(['gsm8k,gpqa']);
  });

  it('has default significance level of 0.10', () => {
    const opts = parseOpts([]);
    expect(opts.significance).toBe('0.10');
  });

  it('accepts custom significance level', () => {
    const opts = parseOpts(['--significance', '0.05']);
    expect(opts.significance).toBe('0.05');
  });

  it('accepts custom judge model', () => {
    const opts = parseOpts(['--judge-model', 'openai:gpt-4o']);
    expect(opts.judgeModel).toBe('openai:gpt-4o');
  });

  it('accepts custom concurrency', () => {
    const opts = parseOpts(['--concurrency', '50']);
    expect(opts.concurrency).toBe('50');
  });

  it('accepts custom temperature', () => {
    const opts = parseOpts(['--temperature', '1.0']);
    expect(opts.temperature).toBe('1.0');
  });
});
