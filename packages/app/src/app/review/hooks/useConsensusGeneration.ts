
import { useState } from 'react';
import { useStore } from '~/store';
import { EloRankingConsensus } from '@ensemble-ai/shared-utils/consensus/EloRankingConsensus';
import { StandardConsensus } from '@ensemble-ai/shared-utils/consensus/StandardConsensus';
import { ProviderRegistry } from '@ensemble-ai/shared-utils/providers';
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
        const effectiveSummarizerModelId = summarizerOverride || summarizerModelId;

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

            // For now, we assume the summarizer provider is what we use for "judging" as well in ELO,
            // OR we need to find the provider for the summarizer model.
            // We can iterate available providers or assume a mapping.
            // Since we don't store provider for summarizer explicitly in store (just ID), 
            // we might need to find it.
            // But wait, `summarizerModel` is just string ID.
            // We need to find the provider for this ID.
            // Let's assume we can look it up from available models or just iterate.
            // For simplicity/safety, let's look up in the models list if we had it.
            // But this hook doesn't have access to "all available models" easily unless we select from store.
            // For now, let's use the registry's method if available, or hack it?
            // Actually `useStore` has `selectedModels` which has provider info,
            // but the summarizer MIGHT NOT be one of the selected generating models (though UI enforces it?).
            // The UI `EnsembleConfigurationSummary` shows `summarizerModel`.
            // The `ModelSelectionList` enforces summarizer is one of selected or just one available?
            // Usually summarizer is one of the available models, not necessarily selected for generation.

            // Let's blindly try to find provider or default to something safe.
            // Ideally we pass full model info.

            // HACK: For MVP/Prototype, we will try to find the provider from the ID.
            // Common IDs: 'gpt-4o' -> openai, 'claude-3-opus' -> anthropic.
            // Dynamic loading prefers API results, but we need model metadata for provider lookup
            // Use FALLBACK_MODELS for provider resolution
            const { FALLBACK_MODELS } = await import('~/lib/models');
            const summarizerModelDef = FALLBACK_MODELS.find(m => m.id === effectiveSummarizerModelId);

            if (!summarizerModelDef) {
                throw new Error(`Summarizer model definition not found for ID: ${effectiveSummarizerModelId}`);
            }

            const providerName = summarizerModelDef.provider;
            const providerClient = registry.getProvider(providerName, clientMode);

            const consensusResponses: ConsensusModelResponse[] = responses.map(r => ({
                modelId: r.modelId,
                modelName: r.modelName,
                content: r.content
            }));

            let resultText = '';

            if (consensusMethod === 'elo') {
                // For ELO, we need a Judge and a Summarizer.
                // We'll use the SAME provider/model for both for now as per "judgeProvider" argument.
                // Or we could allow separate configuration.
                // "User's main objective... using a summarizer model to rate responses... and then generating consensus".
                // So same model.

                const strategy = new EloRankingConsensus(
                    providerClient,
                    effectiveSummarizerModelId,
                    providerClient,
                    effectiveSummarizerModelId
                );

                resultText = await strategy.generateConsensus(consensusResponses, eloTopN, originalPrompt);

            } else {
                // Standard
                const strategy = new StandardConsensus(
                    providerClient,
                    effectiveSummarizerModelId
                );

                resultText = await strategy.generateConsensus(consensusResponses, 0, originalPrompt);
            }

            setMetaAnalysis(resultText);

        } catch (err: any) {
            console.error('Consensus Generation Error:', err);
            setError(err.message || 'Failed to generate consensus');
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
