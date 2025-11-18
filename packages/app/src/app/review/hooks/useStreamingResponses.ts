import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '~/store';
import { ProviderRegistry, type ProviderName } from '@ensemble-ai/shared-utils/providers';
import { initializeProviders } from '~/providers';

interface UseStreamingResponsesProps {
    hasHydrated: boolean;
    prompt: string | null;
    mode: 'free' | 'pro' | 'mock'; // Assuming these are the modes
    skipRedirectRef: React.MutableRefObject<boolean>;
}

export function useStreamingResponses({
    hasHydrated,
    prompt,
    mode,
    skipRedirectRef,
}: UseStreamingResponsesProps) {
    const router = useRouter();
    const setCurrentStep = useStore((state) => state.setCurrentStep);
    const completeStep = useStore((state) => state.completeStep);
    const responses = useStore((state) => state.responses);
    const startStreaming = useStore((state) => state.startStreaming);
    const appendStreamChunk = useStore((state) => state.appendStreamChunk);
    const completeResponse = useStore((state) => state.completeResponse);
    const setError = useStore((state) => state.setError);
    const apiKeys = useStore((state) => state.apiKeys);
    const selectedModels = useStore((state) => state.selectedModels);

    useEffect(() => {
        if (!hasHydrated) {
            return;
        }

        // If no prompt, redirect back to prompt page unless a manual navigation already triggered a redirect.
        if (!prompt) {
            if (skipRedirectRef.current) {
                skipRedirectRef.current = false;
                return;
            }

            router.push('/prompt');
            return;
        }

        setCurrentStep('review');
        completeStep('review');

        // Initialize providers if needed
        initializeProviders();
        const registry = ProviderRegistry.getInstance();

        // Trigger API calls for each selected model
        const triggerApiCalls = async () => {
            await Promise.all(
                selectedModels.map(async (model: { id: string; provider: string; model: string }) => {
                    // Skip if already streaming or complete
                    const existingResponse = responses.find((r) => r.modelId === model.id);
                    if (existingResponse?.isStreaming || existingResponse?.isComplete) {
                        return;
                    }

                    startStreaming(model.id, model.provider, model.model);

                    try {
                        // Determine client mode
                        const clientMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' ? 'mock' : mode;

                        if (!registry.hasProvider(model.provider as ProviderName, clientMode)) {
                            throw new Error(`Provider ${model.provider} not available in ${clientMode} mode`);
                        }

                        const providerClient = registry.getProvider(model.provider as ProviderName, clientMode);
                        const apiKey = apiKeys[model.provider as keyof typeof apiKeys]?.key;

                        // For Free mode, we need an API key
                        if (clientMode === 'free' && !apiKey) {
                            throw new Error(`API key for ${model.provider} is missing`);
                        }

                        await providerClient.streamResponse(
                            prompt,
                            model.model,
                            (chunk) => {
                                appendStreamChunk(model.id, chunk);
                            },
                            (_fullResponse, responseTime) => {
                                completeResponse(model.id, responseTime, 0); // Token count 0 for now
                            },
                            (error) => {
                                setError(model.id, error.message);
                            },
                        );
                    } catch (err) {
                        setError(model.id, err instanceof Error ? err.message : String(err));
                    }
                }),
            );
        };

        void triggerApiCalls();
    }, [
        completeStep,
        hasHydrated,
        prompt,
        router,
        setCurrentStep,
        selectedModels,
        responses,
        startStreaming,
        appendStreamChunk,
        completeResponse,
        setError,
        mode,
        apiKeys,
        skipRedirectRef,
    ]);
}
