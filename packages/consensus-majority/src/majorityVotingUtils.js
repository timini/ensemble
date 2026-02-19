export function buildMajorityRankingPrompt(responses, originalPrompt) {
    const responseText = responses
        .map((response) => `Model ID: ${response.modelId}\nModel Name: ${response.modelName}\nResponse:\n${response.content}`)
        .join('\n\n---\n\n');
    return `
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
    { "modelId": "exact-model-id", "alignmentScore": 0-100 }
  ]
}

Rules:
- Include every model exactly once.
- Higher alignmentScore means stronger alignment with majority position.
- No prose, no markdown, JSON only.
    `.trim();
}
export function buildMajoritySynthesisPrompt(params) {
    return `
You are a helpful assistant tasked with creating a final consensus answer from multiple model outputs.
Original Question: ${params.prompt}

Majority Signal:
- Treat the model with ID "${params.majorityModel}" as the majority anchor.
- Prefer details repeated across multiple responses.
- De-prioritize claims that appear in only one response unless they are clearly more correct or complete.

Ranked model responses:
${params.rankedResponseText}

Return a SINGLE final answer that directly addresses the original question.
Do not mention model names, ranking, or voting. Write only the final answer text.
If the question asks for a constrained format (single letter, number, JSON, etc.), output exactly that format and nothing else.
    `.trim();
}
export function parseMajorityVotingOutput(output, responses) {
    const parsed = tryParseMajorityVotingJson(output);
    if (!parsed) {
        return null;
    }
    const responseIds = new Set(responses.map((response) => response.modelId));
    const rankings = [];
    const seenIds = new Set();
    for (const item of parsed.rankings ?? []) {
        if (!item?.modelId || !responseIds.has(item.modelId) || seenIds.has(item.modelId)) {
            continue;
        }
        const score = typeof item.alignmentScore === 'number'
            ? Math.max(0, Math.min(100, item.alignmentScore))
            : 0;
        rankings.push({
            modelId: item.modelId,
            eloScore: score,
            rank: 0,
        });
        seenIds.add(item.modelId);
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
export function buildFallbackRankings(responses) {
    return responses.map((response, index) => ({
        modelId: response.modelId,
        eloScore: 0,
        rank: index + 1,
    }));
}
function tryParseMajorityVotingJson(output) {
    try {
        return JSON.parse(output);
    }
    catch {
        const fencedMatch = output.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (!fencedMatch?.[1]) {
            return null;
        }
        try {
            return JSON.parse(fencedMatch[1]);
        }
        catch {
            return null;
        }
    }
}
