import type { AIProvider } from '../providers/types';
import type { ConsensusModelResponse, ConsensusStrategy, RankingResult } from './types';

const DEFAULT_TOP_K = 3;
const ELO_INITIAL = 1200;
const ELO_K_FACTOR = 32;

export function buildStandardConsensusPrompt(
  originalPrompt: string,
  responses: ConsensusModelResponse[],
): string {
  const responsesText = responses
    .map(
      (response, index) =>
        `Candidate ${index + 1}\nModel: ${response.modelName}\nModel ID: ${response.modelId}\nResponse:\n${response.content}`,
    )
    .join('\n\n---\n\n');

  return `
You are a consensus resolver. Produce the most accurate final answer to the original question.

Original Question:
${originalPrompt}

Top-Ranked Candidate Responses:
${responsesText}

Instructions:
1) Extract each candidate's final answer and key supporting facts.
2) Resolve disagreements by choosing the most defensible answer, prioritizing factual correctness over style.
3) Prefer stronger reasoning over popularity when they conflict.
4) Keep only information needed to answer the original question.
5) Preserve required output constraints from the original question exactly.

Output rules:
- Return ONLY the final user answer text.
- No markdown formatting (no bold, italics, code fences, headings).
- No references to models, ranking, or voting.
- If the question asks for a constrained format (single letter, number, JSON, etc.), output exactly that format and nothing else.
  `.trim();
}

function buildPairwiseJudgePrompt(
  originalPrompt: string,
  modelA: ConsensusModelResponse,
  modelB: ConsensusModelResponse,
): string {
  return `
You are an impartial evaluator selecting the more correct answer.

Original Question:
${originalPrompt}

Candidate A:
Model ID: ${modelA.modelId}
Response:
${modelA.content}

Candidate B:
Model ID: ${modelB.modelId}
Response:
${modelB.content}

Decision rules:
- Choose the answer that is more factually correct and better follows the question constraints.
- If both are equally valid, select TIE.
- Ignore style, verbosity, and confidence wording.

Output exactly one of:
- WINNER: ${modelA.modelId}
- WINNER: ${modelB.modelId}
- WINNER: TIE
  `.trim();
}

export class StandardConsensus implements ConsensusStrategy {
  constructor(
    private summarizerProvider: AIProvider,
    private summarizerModelId: string,
  ) {}

  async rankResponses(
    responses: ConsensusModelResponse[],
    prompt: string,
  ): Promise<RankingResult[]> {
    if (responses.length <= 1) {
      return responses.map((response, index) => ({
        modelId: response.modelId,
        eloScore: ELO_INITIAL,
        rank: index + 1,
      }));
    }

    const eloScores = new Map<string, number>();
    for (const response of responses) {
      eloScores.set(response.modelId, ELO_INITIAL);
    }

    for (let left = 0; left < responses.length; left += 1) {
      for (let right = left + 1; right < responses.length; right += 1) {
        const modelA = responses[left];
        const modelB = responses[right];
        if (!modelA || !modelB) {
          continue;
        }

        const winner = await this.judgePair(prompt, modelA, modelB);
        this.updateElo(
          eloScores,
          modelA.modelId,
          modelB.modelId,
          winner,
        );
      }
    }

    const ranking: RankingResult[] = Array.from(eloScores.entries())
      .map(([modelId, eloScore]) => ({
        modelId,
        eloScore,
        rank: 0,
      }))
      .sort((left, right) => right.eloScore - left.eloScore);

    ranking.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return ranking;
  }

  async generateConsensus(
    responses: ConsensusModelResponse[],
    topN: number,
    originalPrompt: string,
  ): Promise<string> {
    if (responses.length === 0) {
      return 'Failed to generate summary.';
    }

    if (responses.length === 1) {
      return responses[0]?.content ?? 'Failed to generate summary.';
    }

    const ranking = await this.rankResponses(responses, originalPrompt);
    const requestedTopN = topN > 0 ? topN : DEFAULT_TOP_K;
    const effectiveTopN = Math.max(1, Math.min(requestedTopN, ranking.length));
    const selectedIds = new Set(
      ranking.slice(0, effectiveTopN).map((entry) => entry.modelId),
    );

    const selectedResponses = responses.filter((response) =>
      selectedIds.has(response.modelId),
    );

    const synthesisPrompt = buildStandardConsensusPrompt(
      originalPrompt,
      selectedResponses,
    );

    return new Promise((resolve) => {
      this.summarizerProvider.streamResponse(
        synthesisPrompt,
        this.summarizerModelId,
        () => {
          void 0;
        },
        (finalText: string) => resolve(finalText),
        (error: Error) => {
          console.error('Summarizer error:', error);
          resolve('Failed to generate summary.');
        },
      );
    });
  }

  private async judgePair(
    originalPrompt: string,
    modelA: ConsensusModelResponse,
    modelB: ConsensusModelResponse,
  ): Promise<string | null> {
    const prompt = buildPairwiseJudgePrompt(originalPrompt, modelA, modelB);

    return new Promise((resolve) => {
      this.summarizerProvider.streamResponse(
        prompt,
        this.summarizerModelId,
        () => {
          void 0;
        },
        (finalText: string) => {
          const normalized = finalText.toUpperCase();
          if (normalized.includes(`WINNER: ${modelA.modelId.toUpperCase()}`)) {
            resolve(modelA.modelId);
            return;
          }
          if (normalized.includes(`WINNER: ${modelB.modelId.toUpperCase()}`)) {
            resolve(modelB.modelId);
            return;
          }
          resolve(null);
        },
        () => resolve(null),
      );
    });
  }

  private updateElo(
    scores: Map<string, number>,
    playerAId: string,
    playerBId: string,
    winnerId: string | null,
  ): void {
    const ratingA = scores.get(playerAId) ?? ELO_INITIAL;
    const ratingB = scores.get(playerBId) ?? ELO_INITIAL;

    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

    const actualA =
      winnerId === playerAId ? 1 : winnerId === playerBId ? 0 : 0.5;
    const actualB =
      winnerId === playerBId ? 1 : winnerId === playerAId ? 0 : 0.5;

    scores.set(
      playerAId,
      ratingA + ELO_K_FACTOR * (actualA - expectedA),
    );
    scores.set(
      playerBId,
      ratingB + ELO_K_FACTOR * (actualB - expectedB),
    );
  }
}
