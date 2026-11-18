import type { ProviderMode, ProviderName } from '@ensemble-ai/shared-utils/providers';
import type { AnswerSpec } from './lib/finalAnswer.js';

/**
 * Providers the eval CLI can call. `openai-compatible` covers OpenRouter,
 * Groq, Together and local servers (Ollama, LM Studio, llama.cpp, vLLM); its
 * specs carry an endpoint (see modelSpecs.ts).
 */
export type EvalProvider = ProviderName;
export type EvalMode = Extract<ProviderMode, 'mock' | 'free'>;
export type StrategyName = 'standard' | 'elo' | 'majority' | 'council';
export type BenchmarkDatasetName = 'gsm8k' | 'truthfulqa' | 'gpqa' | 'hle' | 'math500' | 'mmlu_pro' | 'simpleqa' | 'arc' | 'hellaswag' | 'hallumix';

/** An OpenAI-compatible endpoint named by a model spec. */
export interface EvalEndpoint {
  /** Endpoint id, the prefix of its qualified model ids (`openrouter`, `ollama`, `compat-1x2y3z`). */
  id: string;
  /** Base URL ending in `/v1`. */
  baseURL: string;
  /** Environment variable that holds the key. An empty key is sent when it is unset. */
  apiKeyEnv: string;
  /** The hosted service rejects calls without a key (OpenRouter, Groq, Together). */
  requiresKey: boolean;
}

export interface ModelSpec {
  provider: EvalProvider;
  /** Model id. For `openai-compatible` it is qualified with the endpoint id (`ollama/llama3.2`). */
  model: string;
  /** Set for `openai-compatible` specs. */
  endpoint?: EvalEndpoint;
}

/** A multiple-choice question in its dataset order, so its options can be shuffled. */
export interface MultipleChoiceSource {
  stem: string;
  choices: string[];
  correctIndex: number;
  /** `dot` writes "Options:\nA. x"; `paren` writes "(A) x" (GPQA). */
  style: 'dot' | 'paren';
  /** Text after the options in the dataset's own prompt, kept for unstructured runs. */
  footer?: string;
}

export interface BenchmarkQuestion {
  id: string;
  prompt: string;
  groundTruth: string;
  category?: string;
  difficulty?: string;
  /** Set by loaders for multiple-choice datasets. */
  multipleChoice?: MultipleChoiceSource;
  /** Displayed option i is dataset option optionPermutation[i]. Set when options were shuffled. */
  optionPermutation?: number[];
  /** Seed the options were shuffled with. */
  optionSeed?: number;
  /** Expected answer shape. Set on structured runs (see methodology.ts). */
  answer?: AnswerSpec;
}

export interface DatasetLoadOptions {
  sample?: number;
  /** Seed for deterministic shuffling. When omitted, uses Math.random(). */
  seed?: number;
  /** Shuffle questions before sampling. Defaults to true. */
  shuffle?: boolean;
  skipDownload?: boolean;
  forceDownload?: boolean;
}

export interface BenchmarkLoader {
  name: BenchmarkDatasetName;
  load(options?: DatasetLoadOptions): Promise<BenchmarkQuestion[]>;
}

/** Why an answer is missing: the call failed, or it ran out of time. Both count as wrong. */
export type AnswerFailure = 'error' | 'timeout';

export interface EvaluationResult {
  correct: boolean;
  expected: string;
  predicted: string | null;
  /** Set when there was no answer to score because the call failed. */
  failure?: AnswerFailure;
}

export interface PromptEvaluation {
  evaluator: 'numeric' | 'mcq' | 'generative' | 'exact-match';
  groundTruth: string;
  accuracy: number;
  results: Record<string, EvaluationResult>;
}

export interface ProviderResponse {
  provider: EvalProvider;
  model: string;
  content: string;
  responseTimeMs: number;
  tokenCount?: number;
  /** Cost from the shared price table (packages/shared-utils/src/pricing). */
  estimatedCostUsd?: number;
  /** True when the provider reported no usage and tokens were estimated from text length. */
  costFromTextLength?: boolean;
  /**
   * Billed tokens of the call. Output tokens include hidden reasoning tokens
   * where the provider bills them as output. `estimated` when the provider
   * reported no usage. Used by `calibrate-tokens`.
   */
  usage?: RecordedUsage;
  /**
   * How the final answer was asked for on a structured run: `structured`
   * when generateStructured returned an answer, `text` when it fell back to
   * a plain reply with a "Final answer:" line. Unset on legacy runs.
   */
  answerSource?: 'structured' | 'text';
  /** Why the structured call failed when the answer fell back to a plain reply. */
  structuredFallback?: string;
  /**
   * Calls made for this answer when it took more than one (transient
   * failures retried). Only the last call's usage is priced: a failed
   * attempt reports no usage to price.
   */
  attempts?: number;
  error?: string;
}

export interface RecordedUsage {
  inputTokens: number;
  outputTokens: number;
  source: 'reported' | 'estimated';
}

export interface SelfConsistencyResult {
  runs: number;
  majorityAnswer: string | null;
  majorityCount: number;
  correct: boolean | null;
}

export interface ConsensusEvaluation {
  evaluator: PromptEvaluation['evaluator'];
  groundTruth: string;
  results: Partial<Record<StrategyName, EvaluationResult>>;
}

export interface ConsensusStrategyMetrics {
  /** Total tokens consumed by this strategy's consensus LLM calls. */
  tokenCount: number;
  /** Wall-clock time for this strategy's consensus generation. */
  durationMs: number;
  /** Cost of the consensus calls from the shared price table. Unset when the model has no price. */
  costUsd?: number;
  /** Set when consensus was a mechanical vote with no LLM call. */
  mechanical?: boolean;
  /** Input tokens of the strategy's calls (reported, or estimated from text length). */
  inputTokens?: number;
  /** Output tokens of the strategy's calls, hidden reasoning included where reported. */
  outputTokens?: number;
  /** Number of LLM calls the strategy made. */
  calls?: number;
}

export interface PromptRunResult {
  questionId?: string;
  prompt: string;
  groundTruth?: string;
  category?: string;
  difficulty?: string;
  responses: ProviderResponse[];
  consensus: Partial<Record<StrategyName, string>>;
  /** Per-strategy token and timing metrics for consensus generation. */
  consensusMetrics?: Partial<Record<StrategyName, ConsensusStrategyMetrics>>;
  evaluation?: PromptEvaluation;
  consensusEvaluation?: ConsensusEvaluation;
  selfConsistency?: SelfConsistencyResult;
  /** Total wall-clock time for this question (model calls + consensus + eval). */
  durationMs?: number;
  /**
   * Set when the question failed or timed out as a whole. The consensus
   * counts as wrong; answers that came back before it are kept and scored,
   * and the models that had not answered count as wrong.
   */
  failure?: AnswerFailure;
  /**
   * Priced cost of an earlier attempt at this entry that a --retry-failed
   * pass replaced: its answers that were not kept and its consensus calls.
   * Not part of any configuration's cost; summed as retry spend.
   */
  priorAttemptCostUsd?: number;
  /** `structured` for runs that asked for structured final answers (see methodology.ts). */
  answerProtocol?: 'structured' | 'legacy';
  /** Displayed option i was dataset option optionPermutation[i]. */
  optionPermutation?: number[];
  optionSeed?: number;
}

export interface BenchmarkResultsFile {
  type: 'benchmark';
  dataset: string;
  mode: EvalMode;
  models: string[];
  strategies: StrategyName[];
  sampleSize: number;
  /** Answer protocol (see methodology.ts). Missing on files made before it existed, which are legacy. */
  answerProtocol?: 'structured' | 'legacy';
  /** Seed multiple-choice options were shuffled with. */
  optionSeed?: number;
  createdAt: string;
  updatedAt: string;
  runs: PromptRunResult[];
}

export interface BaselineResultsFile {
  type: 'baseline';
  dataset: string;
  mode: EvalMode;
  model: string;
  sampleSize: number;
  createdAt: string;
  updatedAt: string;
  runs: PromptRunResult[];
}
