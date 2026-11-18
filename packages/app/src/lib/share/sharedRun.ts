import { z } from "zod";
import type { AgreementSummaryProps } from "@/components/molecules/AgreementSummary";
import type { ConsensusAnswerProps } from "@/components/molecules/ConsensusAnswer";
import type { AnswerColumnItem } from "@/components/organisms/AnswerColumns";

/**
 * What a share link shows: the prompt, every answer, the agreement score and
 * the consensus, as the workspace showed them. Only these fields are kept;
 * the schema is strict, so anything else (keys, endpoints, usage) is refused
 * by the server rather than stored.
 */

/** Most answers in one shared run (6 models plus manual answers). */
export const MAX_SHARED_ANSWERS = 12;
/** Longest prompt, answer or consensus kept, in characters. */
export const MAX_SHARED_TEXT = 60_000;
/** Largest shared run, as JSON, in characters. Firestore documents hold 1 MiB. */
export const MAX_SHARED_RUN_JSON = 400_000;

const text = z.string().max(MAX_SHARED_TEXT);
const name = z.string().min(1).max(200);
const score = z.number().min(-1).max(1);

const answerSchema = z
  .object({
    id: name,
    modelName: name,
    provider: z.string().max(64).optional(),
    providerLabel: z.string().max(200).optional(),
    kind: z.enum(["model", "manual"]).optional(),
    status: z.enum(["complete", "error"]),
    content: text.optional(),
    error: z.string().max(2000).optional(),
  })
  .strict();

const agreementSchema = z
  .object({
    score,
    pairs: z.array(z.object({ a: name, b: name, score }).strict()).max(100),
    thresholds: z.object({ high: score, medium: score }).strict().optional(),
    calibration: z
      .object({
        calibrated: z.boolean(),
        embeddingModel: z.string().max(200).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const majorityVoteSchema = z
  .object({
    outcome: z.enum(["winner", "tie", "no-short-answers", "extraction-failed"]),
    options: z
      .array(
        z
          .object({
            answer: z.string().max(2000),
            votes: z.number().int().min(0).max(100),
            models: z.array(name).max(MAX_SHARED_ANSWERS),
          })
          .strict(),
      )
      .max(MAX_SHARED_ANSWERS),
    totalResponses: z.number().int().min(0).max(100),
    abstainedModels: z.array(name).max(MAX_SHARED_ANSWERS).optional(),
  })
  .strict();

export const sharedRunSchema = z
  .object({
    v: z.literal(1),
    prompt: z.string().min(1).max(MAX_SHARED_TEXT),
    /** When the run started, in epoch milliseconds. */
    runAt: z.number().int().nonnegative(),
    method: z.enum(["standard", "elo", "majority", "council"]),
    summarizerName: z.string().max(200).optional(),
    /** The consensus answer, or null when the run kept none. */
    consensus: text.nullable(),
    majorityVote: majorityVoteSchema.optional(),
    /** Null when the run had no agreement score. */
    agreement: agreementSchema.nullable(),
    answers: z.array(answerSchema).min(1).max(MAX_SHARED_ANSWERS),
  })
  .strict();

export type SharedRun = z.infer<typeof sharedRunSchema>;
export type SharedAnswer = z.infer<typeof answerSchema>;

/** The run on screen, as the workspace's result components show it. */
export interface SharedRunSource {
  prompt: string;
  runAt: number;
  agreement: AgreementSummaryProps;
  consensus: Pick<
    ConsensusAnswerProps,
    "status" | "text" | "method" | "summarizerName" | "majorityVote"
  >;
  answers: AnswerColumnItem[];
}

function clip(value: string): string {
  return value.length > MAX_SHARED_TEXT
    ? value.slice(0, MAX_SHARED_TEXT)
    : value;
}

/**
 * The finished run on screen as a shared run, or null while it cannot be
 * shared yet (an answer still streaming, or no finished answer at all).
 * Only display fields are copied: no callbacks, costs, usage or settings.
 */
export function toSharedRun(source: SharedRunSource): SharedRun | null {
  const { agreement, consensus } = source;
  if (
    source.answers.some(
      (a) => a.status === "streaming" || a.status === "waiting",
    )
  )
    return null;
  const answers = source.answers.map(
    (a): SharedAnswer => ({
      id: a.id,
      modelName: a.modelName,
      ...(a.provider ? { provider: a.provider } : {}),
      ...(a.providerLabel ? { providerLabel: a.providerLabel } : {}),
      ...(a.kind ? { kind: a.kind } : {}),
      status: a.status === "error" ? "error" : "complete",
      ...(a.content ? { content: clip(a.content) } : {}),
      ...(a.status === "error" && a.error
        ? { error: a.error.slice(0, 2000) }
        : {}),
    }),
  );
  if (!answers.some((a) => a.status === "complete")) return null;
  const vote = consensus.majorityVote;
  return {
    v: 1,
    prompt: clip(source.prompt),
    runAt: Math.max(0, Math.round(source.runAt)),
    method: consensus.method,
    ...(consensus.summarizerName
      ? { summarizerName: consensus.summarizerName }
      : {}),
    consensus:
      consensus.status === "success" && consensus.text
        ? clip(consensus.text)
        : null,
    ...(vote
      ? {
          majorityVote: {
            outcome: vote.outcome,
            options: vote.options.map((o) => ({
              answer: o.answer,
              votes: o.votes,
              models: o.models,
            })),
            totalResponses: vote.totalResponses,
            ...(vote.abstainedModels
              ? { abstainedModels: vote.abstainedModels }
              : {}),
          },
        }
      : {}),
    agreement:
      agreement.status === "ready" && agreement.score !== undefined
        ? {
            score: agreement.score,
            pairs: (agreement.pairs ?? []).map((p) => ({
              a: p.a,
              b: p.b,
              score: p.score,
            })),
            ...(agreement.thresholds
              ? {
                  thresholds: {
                    high: agreement.thresholds.high,
                    medium: agreement.thresholds.medium,
                  },
                }
              : {}),
            ...(agreement.calibration
              ? {
                  calibration: {
                    calibrated: agreement.calibration.calibrated,
                    ...(agreement.calibration.embeddingModel
                      ? { embeddingModel: agreement.calibration.embeddingModel }
                      : {}),
                  },
                }
              : {}),
          }
        : null,
    answers,
  };
}
