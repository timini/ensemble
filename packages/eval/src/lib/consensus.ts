import type { AIProvider } from '@ensemble-ai/shared-utils/providers';
import { EloRankingConsensus } from '@ensemble-ai/shared-utils/consensus/EloRankingConsensus';
import { MajorityVotingConsensus } from '@ensemble-ai/shared-utils/consensus/MajorityVotingConsensus';
import { StandardConsensus } from '@ensemble-ai/shared-utils/consensus/StandardConsensus';
import type { ConsensusModelResponse } from '@ensemble-ai/shared-utils/consensus/types';
import type { ProviderResponse, StrategyName } from '../types.js';
import { explodeList } from './modelSpecs.js';

const VALID_STRATEGIES: StrategyName[] = ['standard', 'elo', 'majority'];
const VALID_STRATEGY_SET = new Set<StrategyName>(VALID_STRATEGIES);
const MIN_RESPONSES_FOR_ELO = 3;
const MIN_RESPONSES_FOR_MAJORITY = 2;

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
  return responses
    .filter((response) => !response.error)
    .map((response) => ({
      modelId: response.model,
      modelName: `${response.provider}:${response.model}`,
      content: response.content,
    }));
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
  for (const strategy of strategies) {
    if (strategy === 'standard') {
      const standard = new StandardConsensus(summarizerClient, summarizerModel);
      outputs.standard = await standard.generateConsensus(
        consensusResponses,
        0,
        prompt,
      );
      continue;
    }

    if (strategy === 'elo') {
      if (consensusResponses.length < MIN_RESPONSES_FOR_ELO) {
        outputs.elo =
          `ELO strategy requires at least ${MIN_RESPONSES_FOR_ELO} successful model responses.`;
        continue;
      }

      const elo = new EloRankingConsensus(
        summarizerClient,
        summarizerModel,
        summarizerClient,
        summarizerModel,
      );
      outputs.elo = await elo.generateConsensus(
        consensusResponses,
        Math.min(MIN_RESPONSES_FOR_ELO, consensusResponses.length),
        prompt,
      );
      continue;
    }

    if (strategy === 'majority') {
      if (consensusResponses.length < MIN_RESPONSES_FOR_MAJORITY) {
        outputs.majority =
          `Majority strategy requires at least ${MIN_RESPONSES_FOR_MAJORITY} successful model responses.`;
        continue;
      }

      const majority = new MajorityVotingConsensus(summarizerClient, summarizerModel);
      outputs.majority = await majority.generateConsensus(
        consensusResponses,
        consensusResponses.length,
        prompt,
      );
    }
  }

  return outputs;
}
