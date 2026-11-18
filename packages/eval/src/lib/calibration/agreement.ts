/**
 * Agreement calibration: pairs of answers to the same question, labelled
 * agree or disagree by their mechanically read final answers, and a fit of
 * the cosine cut-offs for the app's high, medium and low agreement labels.
 */
import { keyedResponses } from '../evaluation.js';
import type { BenchmarkResultsFile } from '../../types.js';

export interface AnswerPair {
  questionId: string;
  /** Result keys of the two answers (`provider:model`). */
  a: string;
  b: string;
  /** Text of each answer, as the app would embed it. */
  textA: string;
  textB: string;
  /** True when the mechanically read final answers match. */
  agree: boolean;
}

export interface ScoredPair {
  cosine: number;
  agree: boolean;
}

export interface AgreementFit {
  high: number;
  medium: number;
  auc: number;
  pairs: number;
  agreePairs: number;
  disagreePairs: number;
}

export interface FitOptions {
  /** Share of pairs above `high` that must agree. Default 0.9. */
  highPrecision?: number;
  /** Fewest pairs above `high` for the precision to count. Default 10. */
  minSupport?: number;
  /** Fewest pairs of each label needed to fit at all. Default 5. */
  minPerLabel?: number;
}

/** Final answers compared as the matrix scores them: letters case-blind, numbers by value. */
export function sameFinalAnswer(a: string, b: string): boolean {
  const clean = (v: string) => v.trim().replace(/,/g, '').toUpperCase();
  const x = clean(a);
  const y = clean(b);
  const nx = Number(x);
  const ny = Number(y);
  if (x !== '' && y !== '' && Number.isFinite(nx) && Number.isFinite(ny)) return Math.abs(nx - ny) < 1e-9;
  return x === y;
}

/** Every pair of answers to one question that both have a mechanically read final answer. */
export function answerPairs(files: BenchmarkResultsFile[]): AnswerPair[] {
  const pairs: AnswerPair[] = [];
  for (const file of files) {
    for (const run of file.runs) {
      const results = run.evaluation?.results ?? {};
      const readable = keyedResponses(run.responses).filter(({ key, response }) =>
        !response.error && response.content.trim() && typeof results[key]?.predicted === 'string');
      for (let i = 0; i < readable.length; i += 1) {
        for (let j = i + 1; j < readable.length; j += 1) {
          const first = readable[i]!;
          const second = readable[j]!;
          pairs.push({
            questionId: `${file.dataset}/${run.questionId ?? run.prompt.slice(0, 40)}`,
            a: first.key,
            b: second.key,
            textA: first.response.content,
            textB: second.response.content,
            agree: sameFinalAnswer(results[first.key]!.predicted!, results[second.key]!.predicted!),
          });
        }
      }
    }
  }
  return pairs;
}

/** Area under the ROC curve of cosine as a score for agreement (Mann-Whitney, ties count half). */
export function rocAuc(points: ScoredPair[]): number {
  const pos = points.filter((p) => p.agree).map((p) => p.cosine);
  const neg = points.filter((p) => !p.agree).map((p) => p.cosine);
  if (pos.length === 0 || neg.length === 0) return 0.5;
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;

/**
 * Fit the cut-offs. `medium` is the cosine that best separates agreeing from
 * disagreeing pairs (largest Youden J, labelling cosine >= t as agree).
 * `high` is the lowest cosine above which at least `highPrecision` of the
 * pairs agree, with `minSupport` pairs above it; when no cosine qualifies it
 * is the largest cosine seen, so almost nothing is labelled high.
 */
export function fitAgreementThresholds(points: ScoredPair[], options: FitOptions = {}): AgreementFit {
  const precisionTarget = options.highPrecision ?? 0.9;
  const minSupport = options.minSupport ?? 10;
  const minPerLabel = options.minPerLabel ?? 5;
  const agreePairs = points.filter((p) => p.agree).length;
  const disagreePairs = points.length - agreePairs;
  if (agreePairs < minPerLabel || disagreePairs < minPerLabel) {
    throw new Error(
      `Not enough pairs to fit: ${agreePairs} agreeing and ${disagreePairs} disagreeing (need ${minPerLabel} of each).`,
    );
  }
  const cosines = [...new Set(points.map((p) => p.cosine))].sort((a, b) => a - b);

  let medium = cosines[0]!;
  let bestJ = -Infinity;
  for (const t of cosines) {
    const tp = points.filter((p) => p.agree && p.cosine >= t).length;
    const fp = points.filter((p) => !p.agree && p.cosine >= t).length;
    const j = tp / agreePairs - fp / disagreePairs;
    if (j > bestJ) {
      bestJ = j;
      medium = t;
    }
  }

  let high = cosines[cosines.length - 1]!;
  for (const t of cosines) {
    if (t < medium) continue;
    const above = points.filter((p) => p.cosine > t);
    if (above.length < minSupport) break;
    if (above.filter((p) => p.agree).length / above.length >= precisionTarget) {
      high = t;
      break;
    }
  }

  return {
    high: round(Math.max(high, medium)),
    medium: round(medium),
    auc: round(rocAuc(points)),
    pairs: points.length,
    agreePairs,
    disagreePairs,
  };
}
