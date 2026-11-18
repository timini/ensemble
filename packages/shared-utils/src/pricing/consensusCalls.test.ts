import { describe, expect, it } from 'vitest';
import { countConsensusCalls } from './consensusCalls';

const totals = (method: Parameters<typeof countConsensusCalls>[0]['method'], n: number) =>
  countConsensusCalls({ method, modelCount: n, responseCount: n, eloTopN: 3 });

describe('countConsensusCalls', () => {
  // Expected counts come from the strategy code:
  // standard: one synthesis call (StandardConsensus.generateConsensus).
  // majority: one answer extraction call; a decisive vote stops there, otherwise
  //   one ranking call and one synthesis call (MajorityVotingConsensus.runConsensus).
  // elo: two judge calls per pair (judgePairWithSwap) and one summary.
  // council: N*(N-1) critiques, N rebuttals, N*(N-1) judgments, one ELO judge
  //   call per pair of valid branches and one summary (CouncilConsensus.runPipeline).
  const cases: [string, number, number, number][] = [
    // method, N, max calls, min calls
    ['standard', 2, 1, 1],
    ['standard', 3, 1, 1],
    ['standard', 4, 1, 1],
    ['standard', 5, 1, 1],
    ['standard', 6, 1, 1],
    ['majority', 2, 3, 1],
    ['majority', 3, 3, 1],
    ['majority', 4, 3, 1],
    ['majority', 5, 3, 1],
    ['majority', 6, 3, 1],
    ['elo', 3, 7, 7],
    ['elo', 4, 13, 13],
    ['elo', 5, 21, 21],
    ['elo', 6, 31, 31],
    ['council', 3, 19, 16],
    ['council', 4, 35, 29],
    ['council', 5, 56, 46],
    ['council', 6, 82, 67],
  ];

  it.each(cases)('%s with %i models makes %i calls (at least %i)', (method, n, max, min) => {
    const result = totals(method as 'standard', n);
    expect(result.available).toBe(true);
    expect(result.maxCalls).toBe(max);
    expect(result.minCalls).toBe(min);
    expect(result.phases.reduce((sum, phase) => sum + phase.calls, 0)).toBe(max);
  });

  it.each(['elo', 'council'] as const)('%s with 2 models makes no calls: it needs 3 answers', (method) => {
    const result = totals(method, 2);
    expect(result.available).toBe(false);
    expect(result.maxCalls).toBe(0);
    expect(result.phases).toEqual([]);
  });

  it('makes no consensus calls with fewer than 2 answers', () => {
    const result = totals('standard', 1);
    expect(result.available).toBe(false);
    expect(result.maxCalls).toBe(0);
  });

  it('splits majority into the vote and the LLM fallback', () => {
    expect(totals('majority', 4).phases).toEqual([
      { phase: 'extraction', calls: 1, caller: 'summarizer' },
      { phase: 'ranking', calls: 1, caller: 'summarizer' },
      { phase: 'synthesis', calls: 1, caller: 'summarizer' },
    ]);
  });

  it('splits council with 5 models into its rounds', () => {
    expect(totals('council', 5).phases).toEqual([
      { phase: 'critique', calls: 20, caller: 'participants' },
      { phase: 'rebuttal', calls: 5, caller: 'participants' },
      { phase: 'judgment', calls: 20, caller: 'participants' },
      { phase: 'ranking', calls: 10, caller: 'participants' },
      { phase: 'summary', calls: 1, caller: 'summarizer' },
    ]);
  });

  it('counts manual answers as council branches without giving them calls', () => {
    // 3 models + 1 manual answer: 4 branches, 3 participants.
    const result = countConsensusCalls({
      method: 'council',
      modelCount: 3,
      responseCount: 4,
      eloTopN: 3,
    });
    expect(result.phases).toEqual([
      { phase: 'critique', calls: 9, caller: 'participants' },
      { phase: 'rebuttal', calls: 3, caller: 'participants' },
      { phase: 'judgment', calls: 9, caller: 'participants' },
      { phase: 'ranking', calls: 6, caller: 'participants' },
      { phase: 'summary', calls: 1, caller: 'summarizer' },
    ]);
  });

  it('lets manual answers make ELO available with 2 models', () => {
    const result = countConsensusCalls({
      method: 'elo',
      modelCount: 2,
      responseCount: 3,
      eloTopN: 3,
    });
    expect(result.available).toBe(true);
    expect(result.maxCalls).toBe(7);
  });
});
