import type { ProviderResponse } from '../types.js';
import { answersMatch, extractFinalAnswer, isMechanical, type AnswerSpec } from './finalAnswer.js';

export interface MechanicalVote {
  /** The winning answer as first written. */
  answer: string;
  votes: number;
  /** Replies with a readable answer. */
  voters: number;
  /** True when another answer had as many votes; the first one given wins. */
  tie: boolean;
  /** Text recorded as the strategy's output, readable by the evaluator. */
  text: string;
}

/**
 * Majority vote over the structured final answers, with no LLM call.
 * Answers that match for their kind (answersMatch) count as one. Failed or
 * unreadable replies do not vote. Returns null for free-text answers, which
 * need the LLM majority strategy, or when no reply has a readable answer.
 */
export function mechanicalMajority(responses: ProviderResponse[], spec: AnswerSpec): MechanicalVote | null {
  if (!isMechanical(spec)) return null;
  const tallies: Array<{ answer: string; votes: number }> = [];
  let voters = 0;
  for (const response of responses) {
    if (response.error) continue;
    const answer = extractFinalAnswer(response.content, spec);
    if (answer === null) continue;
    voters += 1;
    const tally = tallies.find((t) => answersMatch(answer, t.answer, spec));
    if (tally) tally.votes += 1;
    else tallies.push({ answer, votes: 1 });
  }
  if (tallies.length === 0) return null;

  const top = Math.max(...tallies.map((t) => t.votes));
  const winners = tallies.filter((t) => t.votes === top);
  const winner = winners[0];
  return {
    answer: winner.answer,
    votes: winner.votes,
    voters,
    tie: winners.length > 1,
    text: `Final answer: ${winner.answer}`,
  };
}
