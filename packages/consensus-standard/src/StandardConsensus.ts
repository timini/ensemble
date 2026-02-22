
import type { AIProvider, ConsensusModelResponse, ConsensusStrategy, RankingResult } from '@ensemble-ai/consensus-core';

function writeDebug(message: string): void {
    const stderr = (globalThis as {
        process?: { stderr?: { write?: (chunk: string) => void } };
    }).process?.stderr;
    if (typeof stderr?.write === 'function') {
        stderr.write(message);
    }
}

export class StandardConsensus implements ConsensusStrategy {
    constructor(
        private summarizerProvider: AIProvider,
        private summarizerModelId: string
    ) { }

    /**
     * Standard consensus does not rank responses, but returns a dummy valid ranking (or 0 rank) if forced.
     * In the UI, if Standard is selected, we might not show ranking.
     */
    async rankResponses(responses: ConsensusModelResponse[], prompt: string): Promise<RankingResult[]> {
        // Standard consensus does not rank responses, but returns a dummy valid ranking (or 0 rank) if forced.
        // In the UI, if Standard is selected, we might not show ranking.
        void prompt; // Unused
        return responses.map((r, index) => ({
            modelId: r.modelId,
            eloScore: 0,
            rank: index + 1
        }));
    }

    async generateConsensus(responses: ConsensusModelResponse[], topN: number, originalPrompt: string): Promise<string> {
        void topN; // Unused
        const sumStart = Date.now();
        writeDebug(`    [standard] generateConsensus start: ${responses.length} responses\n`);

        const responsesText = responses.map(r => `Model: ${r.modelName}\nResponse:\n${r.content}`).join('\n\n---\n\n');

        const prompt = `
You are a helpful assistant tasked with synthesizing multiple AI responses into a single, enhanced answer.
Original Question: ${originalPrompt}

Here are the responses from multiple AI models:

${responsesText}

Your task is to produce a SINGLE, UNIFIED response that directly answers the original question.
Do NOT compare or analyze the responses. Do NOT mention "models agree/disagree" or reference the individual responses.
Instead, synthesize the best elements from all responses into one coherent, comprehensive answer that a user would receive as the final response to their question.
Write as if you are directly answering the original question yourself, enhanced by the collective intelligence of the ensemble.
If the question asks for a constrained format (single letter, number, JSON, etc.), output exactly that format and nothing else.
        `.trim();

        return new Promise((resolve) => {
            this.summarizerProvider.streamResponse(prompt, this.summarizerModelId,
                () => { void 0; },
                (finalText: string) => {
                    writeDebug(`    [standard] generateConsensus done in ${((Date.now() - sumStart) / 1000).toFixed(1)}s\n`);
                    resolve(finalText);
                },
                (err: Error) => {
                    writeDebug(`    [standard] generateConsensus error in ${((Date.now() - sumStart) / 1000).toFixed(1)}s: ${err.message}\n`);
                    resolve('Failed to generate summary.');
                }
            );
        });
    }
}
