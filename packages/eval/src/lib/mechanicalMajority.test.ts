import { describe, expect, it } from 'vitest';
import { mechanicalMajority } from './mechanicalMajority.js';
import type { ProviderResponse } from '../types.js';

function reply(content: string, error?: string): ProviderResponse {
  return { provider: 'openai', model: 'm', content, responseTimeMs: 1, ...(error ? { error } : {}) };
}

describe('mechanicalMajority', () => {
  const choice = { kind: 'choice' as const, choices: ['A', 'B', 'C', 'D'] };

  it('picks the most common extracted answer', () => {
    const vote = mechanicalMajority(
      [reply('Final answer: B'), reply('{"answer":"b"}'), reply('Final answer: C')],
      choice,
    );
    expect(vote).toEqual({ answer: 'B', votes: 2, voters: 3, tie: false, text: 'Final answer: B' });
  });

  it('treats equal numbers written differently as one answer', () => {
    const vote = mechanicalMajority(
      [reply('Final answer: 1,000'), reply('Final answer: 1000.0'), reply('Final answer: 7')],
      { kind: 'numeric' },
    );
    expect(vote?.votes).toBe(2);
  });

  it('breaks ties by the first answer given, and says so', () => {
    const vote = mechanicalMajority([reply('Final answer: C'), reply('Final answer: A')], choice);
    expect(vote).toMatchObject({ answer: 'C', votes: 1, tie: true });
  });

  it('ignores failed and unreadable replies, and returns null when nothing is left', () => {
    expect(mechanicalMajority([reply('', 'timeout'), reply('no idea')], choice)).toBeNull();
    expect(mechanicalMajority([reply('', 'timeout'), reply('Final answer: D')], choice)?.voters).toBe(1);
  });

  it('refuses free-text answers', () => {
    expect(mechanicalMajority([reply('Final answer: Paris')], { kind: 'text' })).toBeNull();
  });
});
