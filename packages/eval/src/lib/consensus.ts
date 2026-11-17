import type {
  AIProvider,
  GenerateStructuredOptions,
  JsonSchema,
  StreamResponseOptions,
  StructuredResponse,
  TokenUsage,
} from '@ensemble-ai/shared-utils/providers';
import {
  PRICE_TABLE,
  costOfTokens,
  getModelPrice,
  usageFromText,
  type EndpointLocation,
} from '@ensemble-ai/shared-utils/pricing';
import type { ConsensusModelResponse } from '@ensemble-ai/consensus-core';
import { StandardConsensus } from '@ensemble-ai/consensus-standard';
import { EloRankingConsensus } from '@ensemble-ai/consensus-elo';
import { MajorityVotingConsensus } from '@ensemble-ai/consensus-majority';
import { CouncilConsensus } from '@ensemble-ai/consensus-council';
import type { CouncilParticipant } from '@ensemble-ai/consensus-council';
import type { ConsensusStrategyMetrics, ProviderResponse, StrategyName } from '../types.js';
import { explodeList } from './modelSpecs.js';
import { isTransientError, retryable, type RetryOptions } from './retryable.js';

const VALID_STRATEGIES: StrategyName[] = ['standard', 'elo', 'majority', 'council'];
const VALID_STRATEGY_SET = new Set<StrategyName>(VALID_STRATEGIES);
const MIN_RESPONSES_FOR_ELO = 3;
const MIN_RESPONSES_FOR_MAJORITY = 2;
const MIN_RESPONSES_FOR_COUNCIL = 3;

export interface ConsensusGenerationResult {
  outputs: Partial<Record<StrategyName, string>>;
  metrics: Partial<Record<StrategyName, ConsensusStrategyMetrics>>;
  /** Strategies that failed, with the error message. They have no output. */
  errors?: Partial<Record<StrategyName, string>>;
}

/** Where the summarizer runs, so its calls can be priced from the shared table. */
export interface ConsensusPricing {
  /** Summarizer provider name (`openai`, `openai-compatible`...). */
  provider: string;
  /** OpenAI-compatible endpoints, so local summarizers cost 0. */
  endpoints?: EndpointLocation[];
}

/** Limits and retries for the summarizer's calls. */
export interface ConsensusCallOptions {
  /** Limit for one summarizer call, in ms; the request is aborted when it passes. Default: the client's (120 s for streams). */
  timeoutMs?: number;
  /** Retries for transient failures (network, 429, 5xx, timeouts, empty replies). None by default. */
  retry?: RetryOptions;
  /** Aborts every summarizer call (the question ran out of time). */
  signal?: AbortSignal;
}

/**
 * Wraps an AIProvider to count tokens and cost across all calls. Cost uses
 * the usage the provider reported, or a text-length estimate, priced with
 * the shared table. It stays undefined when the model has no price.
 */
class TokenCountingProvider implements AIProvider {
  private _totalTokens = 0;
  private _costUsd: number | undefined;
  inputTokens = 0;
  outputTokens = 0;
  calls = 0;
  constructor(
    private inner: AIProvider,
    private pricing?: ConsensusPricing,
    private callOptions: ConsensusCallOptions = {},
  ) {}
  get totalTokens() { return this._totalTokens; }
  get costUsd() { return this._costUsd; }

  private addCost(model: string, usage: TokenUsage): void {
    this.inputTokens += usage.inputTokens;
    this.outputTokens += usage.outputTokens;
    this.calls += 1;
    if (!this.pricing) return;
    const price = getModelPrice(this.pricing.provider, model, PRICE_TABLE, this.pricing.endpoints ?? []);
    const cost = costOfTokens(price, usage.inputTokens, usage.outputTokens);
    if (cost !== null) this._costUsd = (this._costUsd ?? 0) + cost;
  }

  private withLimits<T extends StreamResponseOptions | GenerateStructuredOptions>(options?: T): T | undefined {
    const { timeoutMs, signal } = this.callOptions;
    if (timeoutMs === undefined && !signal) return options;
    return {
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
      ...(signal ? { signal } : {}),
      ...options,
    } as T;
  }

  private retryOptions(): RetryOptions | undefined {
    const { retry, signal } = this.callOptions;
    if (!retry) return undefined;
    return { isRetryable: isTransientError, ...retry, ...(signal ? { signal } : {}) };
  }

  /**
   * Streams through the inner client. With retry options, a transient
   * failure (or an empty reply) is retried before onError is called, so the
   * strategy sees only the final outcome. Chunks of a failed attempt have
   * already been passed on; the strategies here use only the final text.
   */
  async streamResponse(
    prompt: string, model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number, tokenCount?: number, usage?: TokenUsage) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ): Promise<void> {
    const attempt = () => new Promise<{ full: string; time: number; tokens?: number; usage?: TokenUsage }>((resolve, reject) => {
      this.inner.streamResponse(
        prompt, model, onChunk,
        (full, time, tokens, usage) => {
          if (!full.trim()) {
            reject(new Error(`Empty response from ${model}: the summarizer returned no text.`));
            return;
          }
          resolve({ full, time, tokens, usage });
        },
        reject,
        this.withLimits(options),
      ).catch(reject);
    });
    const retry = this.retryOptions();
    let result: Awaited<ReturnType<typeof attempt>>;
    try {
      result = retry ? await retryable(attempt, retry) : await attempt();
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    this._totalTokens += result.tokens ?? 0;
    this.addCost(model, result.usage ?? usageFromText(prompt, result.full));
    onComplete(result.full, result.time, result.tokens, result.usage);
  }

  async generateStructured<T>(prompt: string, model: string, schema: JsonSchema, options?: GenerateStructuredOptions): Promise<StructuredResponse<T>> {
    const call = () => this.inner.generateStructured<T>(prompt, model, schema, this.withLimits(options));
    const retry = this.retryOptions();
    const result = retry ? await retryable(call, retry) : await call();
    this._totalTokens += result.tokenCount
      ?? (result.usage ? result.usage.inputTokens + result.usage.outputTokens : 0);
    this.addCost(model, result.usage ?? usageFromText(prompt, result.raw));
    return result;
  }
  generateEmbeddings(text: string) { return this.inner.generateEmbeddings(text); }
  validateApiKey(apiKey: string) { return this.inner.validateApiKey(apiKey); }
  listAvailableModels() { return this.inner.listAvailableModels(); }
  listAvailableTextModels() { return this.inner.listAvailableTextModels(); }
}

/** Texts the consensus packages return when their summarizer call failed. */
const FAILURE_OUTPUTS = new Set(['Failed to generate summary.', 'Failed to generate council summary.']);

export function parseStrategies(values: string[]): StrategyName[] {
  const items = explodeList(values).map((value) => value.toLowerCase().trim());
  if (items.length === 0) {
    return ['standard'];
  }

  const deduped = [...new Set(items)];
  for (const item of deduped) {
    if (!VALID_STRATEGY_SET.has(item as StrategyName)) {
      throw new Error(
        `Invalid strategy "${item}". Expected one of: ${VALID_STRATEGIES.join(', ')}.`,
      );
    }
  }

  return deduped as StrategyName[];
}

function toConsensusResponses(responses: ProviderResponse[]): ConsensusModelResponse[] {
  const occurrences: Record<string, number> = {};
  return responses
    .filter((response) => !response.error)
    .map((response) => {
      const baseId = response.model;
      const count = (occurrences[baseId] ?? 0) + 1;
      occurrences[baseId] = count;
      // Append #N suffix for duplicate model IDs so that consensus strategies
      // (ELO rankings, majority voting) see each instance as distinct.
      const modelId = count === 1 ? baseId : `${baseId}#${count}`;
      const modelName =
        count === 1
          ? `${response.provider}:${response.model}`
          : `${response.provider}:${response.model}#${count}`;
      return { modelId, modelName, content: response.content };
    });
}

export async function generateConsensus(
  strategies: StrategyName[],
  prompt: string,
  responses: ProviderResponse[],
  summarizerClient: AIProvider,
  summarizerModel: string,
  pricing?: ConsensusPricing,
  callOptions: ConsensusCallOptions = {},
): Promise<ConsensusGenerationResult> {
  const consensusResponses = toConsensusResponses(responses);
  if (consensusResponses.length === 0) {
    return { outputs: {}, metrics: {} };
  }

  process.stderr.write(`  [consensus] start: strategies=[${strategies.join(',')}] responses=${consensusResponses.length}\n`);

  const outputs: Partial<Record<StrategyName, string>> = {};
  const metrics: Partial<Record<StrategyName, ConsensusStrategyMetrics>> = {};
  const errors: Partial<Record<StrategyName, string>> = {};
  const tasks: Promise<void>[] = [];

  const runStrategy = (
    name: StrategyName,
    fn: (counter: TokenCountingProvider) => Promise<string>,
  ): Promise<void> => {
    const counter = new TokenCountingProvider(summarizerClient, pricing, callOptions);
    const start = Date.now();
    process.stderr.write(`  [consensus] ${name} start\n`);
    return fn(counter).then((result) => {
      const durationMs = Date.now() - start;
      if (FAILURE_OUTPUTS.has(result.trim())) {
        // Strategies catch their own errors and return a fixed failure text.
        throw new Error(result.trim());
      }
      outputs[name] = result;
      metrics[name] = {
        tokenCount: counter.totalTokens,
        durationMs,
        inputTokens: counter.inputTokens,
        outputTokens: counter.outputTokens,
        calls: counter.calls,
        ...(counter.costUsd !== undefined ? { costUsd: counter.costUsd } : {}),
      };
      process.stderr.write(`  [consensus] ${name} done in ${(durationMs / 1000).toFixed(1)}s (${counter.totalTokens} tokens)\n`);
    }).catch((err) => {
      const durationMs = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`  [consensus] ${name} error in ${(durationMs / 1000).toFixed(1)}s: ${message}\n`);
      // One failed strategy must not lose the others; the evaluator scores it wrong.
      errors[name] = message;
    });
  };

  for (const strategy of strategies) {
    if (strategy === 'standard') {
      tasks.push(runStrategy('standard', (c) =>
        new StandardConsensus(c, summarizerModel)
          .generateConsensus(consensusResponses, 0, prompt),
      ));
    } else if (strategy === 'elo') {
      if (consensusResponses.length >= MIN_RESPONSES_FOR_ELO) {
        tasks.push(runStrategy('elo', (c) =>
          new EloRankingConsensus(c, summarizerModel, c, summarizerModel)
            .generateConsensus(
              consensusResponses,
              Math.min(MIN_RESPONSES_FOR_ELO, consensusResponses.length),
              prompt,
            ),
        ));
      }
    } else if (strategy === 'majority') {
      if (consensusResponses.length >= MIN_RESPONSES_FOR_MAJORITY) {
        tasks.push(runStrategy('majority', (c) =>
          new MajorityVotingConsensus(c, summarizerModel)
            .generateConsensus(
              consensusResponses,
              MIN_RESPONSES_FOR_MAJORITY,
              prompt,
            ),
        ));
      }
    } else if (strategy === 'council') {
      if (consensusResponses.length >= MIN_RESPONSES_FOR_COUNCIL) {
        tasks.push(runStrategy('council', (c) => {
          const participants: CouncilParticipant[] = consensusResponses.map((r) => ({
            modelId: r.modelId,
            modelName: r.modelName,
            provider: c,
            modelApiId: summarizerModel,
          }));
          return new CouncilConsensus({
            participants,
            summarizerProvider: c,
            summarizerModelId: summarizerModel,
          }).generateConsensus(consensusResponses, 0, prompt);
        }));
      }
    }
  }

  await Promise.all(tasks);

  process.stderr.write(`  [consensus] all strategies complete\n`);
  return Object.keys(errors).length > 0 ? { outputs, metrics, errors } : { outputs, metrics };
}
