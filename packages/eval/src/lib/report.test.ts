import { describe, expect, it } from 'vitest';
import { createMarkdownReport } from './report.js';

describe('createMarkdownReport', () => {
  it('summarizes runs and consensus coverage', () => {
    const markdown = createMarkdownReport('results.json', [
      {
        prompt: 'What is the capital of France?',
        responses: [
          {
            provider: 'openai',
            model: 'gpt-4o',
            content: 'Paris',
            responseTimeMs: 120,
            tokenCount: 12,
          },
          {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-latest',
            content: '',
            responseTimeMs: 0,
            error: 'timeout',
          },
        ],
        consensus: {
          standard: 'Paris is the capital of France.',
        },
      },
    ]);

    expect(markdown).toContain('# Ensemble Eval Report');
    expect(markdown).toContain('Prompts evaluated: 1');
    expect(markdown).toContain('Successful responses: 1');
    expect(markdown).toContain('Failed responses: 1');
    expect(markdown).toContain('`standard`: 1 prompt(s)');
  });
});
