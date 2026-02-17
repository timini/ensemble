import type { AIProvider } from '@ensemble-ai/shared-utils/providers';
import { CouncilConsensus } from '@ensemble-ai/shared-utils/consensus/CouncilConsensus';
import { EloRankingConsensus } from '@ensemble-ai/shared-utils/consensus/EloRankingConsensus';
import { MajorityVotingConsensus } from '@ensemble-ai/shared-utils/consensus/MajorityVotingConsensus';
import { StandardConsensus } from '@ensemble-ai/shared-utils/consensus/StandardConsensus';
import type { CouncilParticipant } from '@ensemble-ai/shared-utils/consensus/councilTypes';
import type { ConsensusModelResponse } from '@ensemble-ai/shared-utils/consensus/types';
import type { ProviderResponse, StrategyName } from '../types.js';
import { explodeList } from './modelSpecs.js';

const VALID_STRATEGIES: StrategyName[] = ['standard', 'elo', 'majority', 'council'];
const VALID_STRATEGY_SET = new Set<StrategyName>(VALID_STRATEGIES);
const MIN_RESPONSES_FOR_ELO = 3;
const MIN_RESPONSES_FOR_MAJORITY = 2;
const MIN_RESPONSES_FOR_COUNCIL = 3;

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
): Promise<Partial<Record<StrategyName, string>>> {
  const consensusResponses = toConsensusResponses(responses);
  if (consensusResponses.length === 0) {
    return {};
  }

  const outputs: Partial<Record<StrategyName, string>> = {};
  const tasks: Promise<void>[] = [];

  for (const strategy of strategies) {
    if (strategy === 'standard') {
      tasks.push(
        new StandardConsensus(summarizerClient, summarizerModel)
          .generateConsensus(consensusResponses, 0, prompt)
          .then((result) => { outputs.standard = result; }),
      );
    } else if (strategy === 'elo') {
      if (consensusResponses.length >= MIN_RESPONSES_FOR_ELO) {
        tasks.push(
          new EloRankingConsensus(
            summarizerClient, summarizerModel, summarizerClient, summarizerModel,
          )
            .generateConsensus(
              consensusResponses,
              Math.min(MIN_RESPONSES_FOR_ELO, consensusResponses.length),
              prompt,
            )
            .then((result) => { outputs.elo = result; }),
        );
      }
    } else if (strategy === 'majority') {
      if (consensusResponses.length >= MIN_RESPONSES_FOR_MAJORITY) {
        tasks.push(
          new MajorityVotingConsensus(summarizerClient, summarizerModel)
            .generateConsensus(consensusResponses, consensusResponses.length, prompt)
            .then((result) => { outputs.majority = result; }),
        );
      }
    } else if (strategy === 'council') {
      if (consensusResponses.length >= MIN_RESPONSES_FOR_COUNCIL) {
        const participants: CouncilParticipant[] = consensusResponses.map((r) => ({
          modelId: r.modelId,
          modelName: r.modelName,
          provider: summarizerClient,
          modelApiId: summarizerModel,
        }));
        tasks.push(
          new CouncilConsensus({
            participants,
            summarizerProvider: summarizerClient,
            summarizerModelId: summarizerModel,
          })
            .generateConsensus(consensusResponses, 0, prompt)
            .then((result) => { outputs.council = result; }),
        );
      }
    }
  }

  await Promise.all(tasks);

  return outputs;
}
