import type { ConsensusMethod } from '@ensemble-ai/consensus-core';

/** A step of a consensus method that makes model calls. */
export type ConsensusPhase =
  | 'synthesis'
  | 'extraction'
  | 'ranking'
  | 'judge'
  | 'summary'
  | 'critique'
  | 'rebuttal'
  | 'judgment';

/**
 * Who makes the calls of a phase: the summarizer model, or the selected
 * models themselves (council rounds).
 */
export type PhaseCaller = 'summarizer' | 'participants';

export interface ConsensusPhaseCalls {
  phase: ConsensusPhase;
  calls: number;
  caller: PhaseCaller;
}

export interface ConsensusCallCount {
  /** False when the method cannot run with this many answers. */
  available: boolean;
  phases: ConsensusPhaseCalls[];
  /** Calls when every step runs in full. */
  maxCalls: number;
  /** Fewest calls when the run succeeds (council ranks only valid branches). */
  minCalls: number;
}

export interface CountConsensusCallsInput {
  method: ConsensusMethod;
  /** Selected models. Council uses them as participants. */
  modelCount: number;
  /** Answers passed to consensus: model answers plus manual answers. */
  responseCount: number;
  eloTopN: number;
}

/** The app starts consensus once it has at least this many answers. */
export const MIN_ANSWERS_FOR_CONSENSUS = 2;
/** ELO and council throw with fewer answers than this. */
export const MIN_ANSWERS_FOR_RANKING = 3;

const pairs = (n: number) => (n * (n - 1)) / 2;

/**
 * Count the model calls a consensus method makes, mirroring the strategy
 * packages:
 *
 * - standard: one synthesis call by the summarizer.
 * - majority: one structured call by the summarizer extracts every short
 *   final answer for a mechanical vote. When the vote has a winner that is
 *   all; on a tie or long-form answers, one ranking call and one synthesis
 *   call follow (the LLM fallback).
 * - elo: two judge calls per pair of answers (position swap) and one summary,
 *   all by the summarizer, which the app also uses as the judge.
 * - council: each participant critiques every other branch, writes one
 *   rebuttal and judges every other branch; then one ELO judge call per pair
 *   of valid branches (rotating participants) and one summary. Manual answers
 *   are branches but not participants. With N models and R answers that is
 *   N*(R-1) + N + N*(R-1) + R*(R-1)/2 + 1 calls at most.
 */
export function countConsensusCalls({
  method,
  modelCount,
  responseCount,
}: CountConsensusCallsInput): ConsensusCallCount {
  const r = responseCount;
  const n = modelCount;
  const minAnswers =
    method === 'elo' || method === 'council' ? MIN_ANSWERS_FOR_RANKING : MIN_ANSWERS_FOR_CONSENSUS;
  if (r < minAnswers) {
    return { available: false, phases: [], maxCalls: 0, minCalls: 0 };
  }

  let phases: ConsensusPhaseCalls[];
  let optionalCalls = 0;
  switch (method) {
    case 'standard':
      phases = [{ phase: 'synthesis', calls: 1, caller: 'summarizer' }];
      break;
    case 'majority':
      phases = [
        { phase: 'extraction', calls: 1, caller: 'summarizer' },
        { phase: 'ranking', calls: 1, caller: 'summarizer' },
        { phase: 'synthesis', calls: 1, caller: 'summarizer' },
      ];
      // A decisive vote skips the LLM fallback.
      optionalCalls = 2;
      break;
    case 'elo':
      phases = [
        { phase: 'judge', calls: 2 * pairs(r), caller: 'summarizer' },
        { phase: 'summary', calls: 1, caller: 'summarizer' },
      ];
      break;
    case 'council':
      phases = [
        { phase: 'critique', calls: n * (r - 1), caller: 'participants' },
        { phase: 'rebuttal', calls: n, caller: 'participants' },
        { phase: 'judgment', calls: n * (r - 1), caller: 'participants' },
        { phase: 'ranking', calls: n > 0 ? pairs(r) : 0, caller: 'participants' },
        { phase: 'summary', calls: 1, caller: 'summarizer' },
      ];
      // If judgment leaves one valid branch, the ranking round makes no calls.
      optionalCalls = n > 0 ? pairs(r) : 0;
      break;
  }

  const maxCalls = phases.reduce((sum, phase) => sum + phase.calls, 0);
  return { available: true, phases, maxCalls, minCalls: maxCalls - optionalCalls };
}
