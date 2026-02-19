
import { useState } from 'react';
import { useStore } from '~/store';
import {
  EloRankingConsensus,
  MajorityVotingConsensus,
  StandardConsensus,
  CouncilConsensus,
  type ConsensusModelResponse,
  type CouncilParticipant,
} from '@ensemble-ai/shared-utils/consensus';
import { ProviderRegistry, type ProviderName } from '@ensemble-ai/shared-utils/providers';
import { FALLBACK_MODELS } from '~/lib/models';
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
            // Try: FALLBACK_MODELS → selected models in store
            const summarizerModelDef = FALLBACK_MODELS.find(m => m.id === effectiveSummarizerModelId);

            let providerName: ProviderName;
            if (summarizerModelDef) {
                providerName = validateProviderName(summarizerModelDef.provider);
            } else {
                const selectedModels = useStore.getState().selectedModels;
                const fromStore = selectedModels.find(m => m.model === effectiveSummarizerModelId);
                if (fromStore) {
                    providerName = validateProviderName(fromStore.provider);
                } else {
                    throw new Error(`Cannot determine provider for summarizer model: ${effectiveSummarizerModelId}`);
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
            } else if (consensusMethod === 'majority') {
                const strategy = new MajorityVotingConsensus(
                    providerClient,
                    effectiveSummarizerModelId
                );

                resultText = await strategy.generateConsensus(consensusResponses, 0, originalPrompt);
            } else if (consensusMethod === 'council') {
                const selectedModels = useStore.getState().selectedModels;
                const participants: CouncilParticipant[] = selectedModels.map((m) => {
                    const pName = validateProviderName(m.provider);
                    return {
                        modelId: m.id,
                        modelName: m.model,
                        provider: registry.getProvider(pName, clientMode),
                        modelApiId: m.model,
                    };
                });

                const strategy = new CouncilConsensus({
                    participants,
                    summarizerProvider: providerClient,
                    summarizerModelId: effectiveSummarizerModelId,
                });

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

const VALID_PROVIDERS: ProviderName[] = ['openai', 'anthropic', 'google', 'xai'];

function validateProviderName(provider: string): ProviderName {
    if (VALID_PROVIDERS.includes(provider as ProviderName)) {
        return provider as ProviderName;
    }
    throw new Error(`Invalid provider: ${provider}`);
}
