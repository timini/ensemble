import type { AIProvider, GenerateStructuredOptions, JsonSchema, StreamResponseOptions, StructuredResponse } from '@ensemble-ai/shared-utils/providers';
import { CouncilConsensus } from '@ensemble-ai/shared-utils/consensus/CouncilConsensus';
import { EloRankingConsensus } from '@ensemble-ai/shared-utils/consensus/EloRankingConsensus';
import { MajorityVotingConsensus } from '@ensemble-ai/shared-utils/consensus/MajorityVotingConsensus';
import { StandardConsensus } from '@ensemble-ai/shared-utils/consensus/StandardConsensus';
import type { CouncilParticipant } from '@ensemble-ai/shared-utils/consensus/councilTypes';
import type { ConsensusModelResponse } from '@ensemble-ai/shared-utils/consensus/types';
import type { ConsensusStrategyMetrics, ProviderResponse, StrategyName } from '../types.js';
import { explodeList } from './modelSpecs.js';

const VALID_STRATEGIES: StrategyName[] = ['standard', 'elo', 'majority', 'council'];
const VALID_STRATEGY_SET = new Set<StrategyName>(VALID_STRATEGIES);
const MIN_RESPONSES_FOR_ELO = 3;
const MIN_RESPONSES_FOR_MAJORITY = 2;
const MIN_RESPONSES_FOR_COUNCIL = 3;

export interface ConsensusGenerationResult {
  outputs: Partial<Record<StrategyName, string>>;
  metrics: Partial<Record<StrategyName, ConsensusStrategyMetrics>>;
}

/** Wraps an AIProvider to count total tokens consumed across all calls. */
class TokenCountingProvider implements AIProvider {
  private _totalTokens = 0;
  constructor(private inner: AIProvider) {}
  get totalTokens() { return this._totalTokens; }
  reset() { this._totalTokens = 0; }

  async streamResponse(
    prompt: string, model: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string, responseTime: number, tokenCount?: number) => void,
    onError: (error: Error) => void,
    options?: StreamResponseOptions,
  ): Promise<void> {
    return this.inner.streamResponse(prompt, model, onChunk, (full, time, tokens) => {
      this._totalTokens += tokens ?? 0;
      onComplete(full, time, tokens);
    }, onError, options);
  }

  generateStructured<T>(prompt: string, model: string, schema: JsonSchema, options?: GenerateStructuredOptions): Promise<StructuredResponse<T>> {
    return this.inner.generateStructured(prompt, model, schema, options);
  }
  generateEmbeddings(text: string) { return this.inner.generateEmbeddings(text); }
  validateApiKey(apiKey: string) { return this.inner.validateApiKey(apiKey); }
  listAvailableModels() { return this.inner.listAvailableModels(); }
  listAvailableTextModels() { return this.inner.listAvailableTextModels(); }
}

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
): Promise<ConsensusGenerationResult> {
  const consensusResponses = toConsensusResponses(responses);
  if (consensusResponses.length === 0) {
    return { outputs: {}, metrics: {} };
  }

  const outputs: Partial<Record<StrategyName, string>> = {};
  const metrics: Partial<Record<StrategyName, ConsensusStrategyMetrics>> = {};
  const tasks: Promise<void>[] = [];

  const runStrategy = (
    name: StrategyName,
    fn: (counter: TokenCountingProvider) => Promise<string>,
  ): Promise<void> => {
    const counter = new TokenCountingProvider(summarizerClient);
    const start = Date.now();
    return fn(counter).then((result) => {
      outputs[name] = result;
      metrics[name] = { tokenCount: counter.totalTokens, durationMs: Date.now() - start };
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
              Math.min(MIN_RESPONSES_FOR_MAJORITY, consensusResponses.length),
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

  return { outputs, metrics };
}
