const INITIAL_ELO = 1200;
const K_FACTOR = 32;
/** Sequential pairwise ELO ranking of valid branches, rotating judges across pairings */
export async function runCouncilEloRanking(validBranches, prompt, participants, completePrompt) {
    if (participants.length === 0)
        return validBranches;
    const eloScores = new Map();
    for (const b of validBranches) {
        eloScores.set(b.modelId, INITIAL_ELO);
    }
    const pairings = [];
    for (let i = 0; i < validBranches.length; i++) {
        for (let j = i + 1; j < validBranches.length; j++) {
            pairings.push([validBranches[i], validBranches[j]]);
        }
    }
    const judgments = await Promise.all(pairings.map(async (pair, idx) => {
        const [branchA, branchB] = pair;
        const judge = participants[idx % participants.length];
        const winnerId = await judgeEloPair(judge, branchA, branchB, prompt, completePrompt);
        return { winnerId, branchA, branchB };
    }));
    for (const { winnerId, branchA, branchB } of judgments) {
        if (winnerId) {
            updateElo(eloScores, branchA.modelId, branchB.modelId, winnerId);
        }
    }
    for (const b of validBranches) {
        b.eloScore = eloScores.get(b.modelId) ?? INITIAL_ELO;
    }
    validBranches.sort((a, b) => b.eloScore - a.eloScore);
    validBranches.forEach((b, i) => { b.rank = i + 1; });
    return validBranches;
}
async function judgeEloPair(judge, branchA, branchB, originalPrompt, completePrompt) {
    const prompt = `
You are an impartial judge evaluating two AI responses.
Question: ${originalPrompt}

Response A (from ${branchA.modelName}):
${branchA.initialAnswer}

Response B (from ${branchB.modelName}):
${branchB.initialAnswer}

Which response is better? Reply EXACTLY with "Winner: ${branchA.modelName}" or "Winner: ${branchB.modelName}". If it is a tie, reply "Winner: Tie".
    `.trim();
    try {
        const output = await completePrompt(judge.provider, judge.modelApiId, prompt);
        if (output.includes(`Winner: ${branchA.modelName}`))
            return branchA.modelId;
        if (output.includes(`Winner: ${branchB.modelName}`))
            return branchB.modelId;
        return null;
    }
    catch {
        return null;
    }
}
function updateElo(scores, playerAId, playerBId, winnerId) {
    const ratingA = scores.get(playerAId);
    const ratingB = scores.get(playerBId);
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));
    const actualA = winnerId === playerAId ? 1 : 0;
    const actualB = winnerId === playerBId ? 1 : 0;
    scores.set(playerAId, ratingA + K_FACTOR * (actualA - expectedA));
    scores.set(playerBId, ratingB + K_FACTOR * (actualB - expectedB));
}
