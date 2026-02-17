import type { ConsensusModelResponse, RankingResult } from './types';

interface MajorityVotingOutput {
    rankings?: {
        modelId?: string;
        alignmentScore?: number;
    }[];
}

export function buildMajorityRankingPrompt(
    responses: ConsensusModelResponse[],
    originalPrompt: string
): { prompt: string; idMap: Map<string, string> } {
    // Anonymize model IDs to prevent hallucination and bias
    const idMap = new Map<string, string>(); // anonymous -> real
    const reverseMap = new Map<string, string>(); // real -> anonymous
    responses.forEach((response, i) => {
        const anonId = `Response-${i + 1}`;
        idMap.set(anonId, response.modelId);
        reverseMap.set(response.modelId, anonId);
    });

    const responseText = responses
        .map(
            (response) => {
                const anonId = reverseMap.get(response.modelId)!;
                return `Response ID: ${anonId}\nResponse:\n${response.content}`;
            }
        )
        .join('\n\n---\n\n');

    const prompt = `
You are evaluating multiple AI responses for majority alignment.
Original Question: ${originalPrompt}

Responses:
${responseText}

Task:
1) Identify which response best represents the majority position.
2) Rank all responses by alignment with that majority position.
3) Output ONLY valid JSON in this shape:
{
  "rankings": [
    { "modelId": "exact-response-id", "alignmentScore": 0-100 }
  ]
}

Rules:
- Include every response exactly once, using its exact Response ID (e.g. "Response-1").
- Higher alignmentScore means stronger alignment with majority position.
- No prose, no markdown, JSON only.
    `.trim();

    return { prompt, idMap };
}

export function buildMajoritySynthesisPrompt(params: {
    prompt: string;
    rankedResponseText: string;
}): string {
    return `
You are a helpful assistant tasked with creating a final consensus answer from multiple model outputs.
Original Question: ${params.prompt}

Majority Signal:
- Responses are ordered from most-aligned to least-aligned with the majority position. Weight the first response most heavily.
- Prefer details repeated across multiple responses.
- De-prioritize claims that appear in only one response unless they are clearly more correct or complete.

Ranked responses:
${params.rankedResponseText}

Return a SINGLE final answer that directly addresses the original question.
Do not mention model names, ranking, or voting. Write only the final answer text.
If the question asks for a constrained format (single letter, number, JSON, etc.), output exactly that format and nothing else. No markdown formatting.
    `.trim();
}

export function parseMajorityVotingOutput(
    output: string,
    responses: ConsensusModelResponse[],
    idMap?: Map<string, string>
): RankingResult[] | null {
    const parsed = tryParseMajorityVotingJson(output);
    if (!parsed) {
        return null;
    }

    const responseIds = new Set(responses.map((response) => response.modelId));
    const rankings: RankingResult[] = [];
    const seenIds = new Set<string>();

    for (const item of parsed.rankings ?? []) {
        if (!item?.modelId) continue;

        // Resolve anonymous ID back to real ID when idMap is provided
        const realId = idMap?.get(item.modelId) ?? item.modelId;

        if (!responseIds.has(realId) || seenIds.has(realId)) {
            continue;
        }

        const score = typeof item.alignmentScore === 'number'
            ? Math.max(0, Math.min(100, item.alignmentScore))
            : 0;

        rankings.push({
            modelId: realId,
            eloScore: score,
            rank: 0,
        });

        seenIds.add(realId);
    }

    if (rankings.length === 0) {
        return null;
    }

    for (const response of responses) {
        if (!seenIds.has(response.modelId)) {
            rankings.push({
                modelId: response.modelId,
                eloScore: 0,
                rank: 0,
            });
        }
    }

    rankings.sort((a, b) => b.eloScore - a.eloScore);
    rankings.forEach((item, index) => {
        item.rank = index + 1;
    });

    return rankings;
}

export function buildFallbackRankings(
    responses: ConsensusModelResponse[]
): RankingResult[] {
    return responses.map((response, index) => ({
        modelId: response.modelId,
        eloScore: 0,
        rank: index + 1,
    }));
}

function tryParseMajorityVotingJson(output: string): MajorityVotingOutput | null {
    try {
        return JSON.parse(output) as MajorityVotingOutput;
    } catch {
        const fencedMatch = output.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (!fencedMatch?.[1]) {
            return null;
        }

        try {
            return JSON.parse(fencedMatch[1]) as MajorityVotingOutput;
        } catch {
            return null;
        }
    }
}
