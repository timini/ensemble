
import { useState } from 'react';
import { useStore } from '~/store';
import { EloRankingConsensus } from '@ensemble-ai/shared-utils/consensus/EloRankingConsensus';
import { StandardConsensus } from '@ensemble-ai/shared-utils/consensus/StandardConsensus';
import { ProviderRegistry, type ProviderName } from '@ensemble-ai/shared-utils/providers';
import type { ConsensusModelResponse } from '@ensemble-ai/shared-utils/consensus/types';
import { logger } from '~/lib/logger';

export function useConsensusGeneration() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setMetaAnalysis = useStore((state) => state.setMetaAnalysis);
    const summarizerModelId = useStore((state) => state.summarizerModel);
    const consensusMethod = useStore((state) => state.consensusMethod);
    const eloTopN = useStore((state) => state.eloTopN);
    const mode = useStore((state) => state.mode);

    const generateConsensus = async (
        responses: { modelId: string; modelName: string; content: string }[],
        originalPrompt: string,
        summarizerOverride?: string
    ) => {
        // Use override if provided, otherwise fall back to store value
        const effectiveSummarizerModelId = summarizerOverride ?? summarizerModelId;

        if (!effectiveSummarizerModelId) {
            setError('No summarizer model selected');
            logger.error('Consensus generation failed: No summarizer model');
            return;
        }

        if (responses.length === 0) {
            setError('No responses to summarize');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // Resolve Dependencies
            const registry = ProviderRegistry.getInstance();
            const clientMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' ? 'mock' : (mode === 'pro' ? 'pro' : 'free');

            // Resolve the provider for the summarizer model.
            // Try: FALLBACK_MODELS → selected models in store → ID pattern inference
            const { FALLBACK_MODELS } = await import('~/lib/models');
            const summarizerModelDef = FALLBACK_MODELS.find(m => m.id === effectiveSummarizerModelId);

            let providerName: ProviderName;
            if (summarizerModelDef) {
                providerName = summarizerModelDef.provider as ProviderName;
            } else {
                // Try to find provider from selected models in the store
                const selectedModels = useStore.getState().selectedModels;
                const fromStore = selectedModels.find(m => m.model === effectiveSummarizerModelId);
                if (fromStore) {
                    providerName = fromStore.provider as ProviderName;
                } else {
                    // Infer provider from model ID naming conventions
                    providerName = inferProviderFromModelId(effectiveSummarizerModelId);
                }
            }
            const providerClient = registry.getProvider(providerName, clientMode);

            const consensusResponses: ConsensusModelResponse[] = responses.map(r => ({
                modelId: r.modelId,
                modelName: r.modelName,
                content: r.content
            }));

            let resultText = '';

            if (consensusMethod === 'elo') {
                const strategy = new EloRankingConsensus(
                    providerClient,
                    effectiveSummarizerModelId,
                    providerClient,
                    effectiveSummarizerModelId
                );

                resultText = await strategy.generateConsensus(consensusResponses, eloTopN, originalPrompt);

            } else {
                const strategy = new StandardConsensus(
                    providerClient,
                    effectiveSummarizerModelId
                );

                resultText = await strategy.generateConsensus(consensusResponses, 0, originalPrompt);
            }

            setMetaAnalysis(resultText);

        } catch (err: unknown) {
            console.error('Consensus Generation Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate consensus');
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        generateConsensus,
        isGenerating,
        error,
        consensusMethod
    };
}

/** Infer the provider from common model ID naming conventions. */
function inferProviderFromModelId(modelId: string): ProviderName {
    const id = modelId.toLowerCase();
    if (id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3')) return 'openai';
    if (id.startsWith('claude')) return 'anthropic';
    if (id.startsWith('gemini')) return 'google';
    if (id.startsWith('grok')) return 'xai';
    throw new Error(`Cannot determine provider for model: ${modelId}`);
}
