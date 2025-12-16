import { useEffect, useRef } from 'react';
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
    // Note: We use useStore.getState().responses inside triggerApiCalls to avoid stale closures
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _responses = useStore((state) => state.responses);
    const startStreaming = useStore((state) => state.startStreaming);
    const appendStreamChunk = useStore((state) => state.appendStreamChunk);
    const completeResponse = useStore((state) => state.completeResponse);
    const setError = useStore((state) => state.setError);
    // Note: We use useStore.getState().apiKeys inside streamModel to avoid stale closures
    const selectedModels = useStore((state) => state.selectedModels);

    // Buffer for streaming chunks to avoid excessive store updates
    const streamBuffers = useRef<Record<string, string>>({});
    const flushIntervals = useRef<Record<string, NodeJS.Timeout>>({});

    const flushBuffer = (modelId: string) => {
        const buffer = streamBuffers.current[modelId];
        if (buffer) {
            appendStreamChunk(modelId, buffer);
            streamBuffers.current[modelId] = '';
        }
    };

    const streamModel = async (modelId: string) => {
        const model = selectedModels.find((m) => m.id === modelId);
        if (!model || !prompt) return;

        initializeProviders();
        const registry = ProviderRegistry.getInstance();

        startStreaming(model.id, model.provider, model.model);

        // Initialize buffer
        streamBuffers.current[modelId] = '';

        // Set up flush interval (every 100ms)
        if (flushIntervals.current[modelId]) {
            clearInterval(flushIntervals.current[modelId]);
        }
        flushIntervals.current[modelId] = setInterval(() => {
            flushBuffer(modelId);
        }, 100);

        try {
            // Determine client mode
            const clientMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' ? 'mock' : mode;

            if (!registry.hasProvider(model.provider as ProviderName, clientMode)) {
                throw new Error(`Provider ${model.provider} not available in ${clientMode} mode`);
            }

            const providerClient = registry.getProvider(model.provider as ProviderName, clientMode);
            // Use getState() to get fresh API keys, avoiding stale closure issues
            const currentApiKeys = useStore.getState().apiKeys;
            const apiKey = currentApiKeys[model.provider as keyof typeof currentApiKeys]?.key;

            // For Free mode, we need an API key
            if (clientMode === 'free' && !apiKey) {
                throw new Error(`API key for ${model.provider} is missing`);
            }

            await providerClient.streamResponse(
                prompt,
                model.model,
                (chunk) => {
                    // Buffer the chunk instead of updating store immediately
                    streamBuffers.current[modelId] += chunk;
                },
                (fullResponse, responseTime, tokenCount) => {
                    // Clear interval and flush remaining buffer
                    if (flushIntervals.current[modelId]) {
                        clearInterval(flushIntervals.current[modelId]);
                        delete flushIntervals.current[modelId];
                    }
                    flushBuffer(modelId);
                    completeResponse(model.id, responseTime, tokenCount);
                },
                (error) => {
                    console.error(`[useStreamingResponses] Error for ${modelId}:`, error);
                    if (flushIntervals.current[modelId]) {
                        clearInterval(flushIntervals.current[modelId]);
                        delete flushIntervals.current[modelId];
                    }
                    setError(model.id, error.message);
                },
            );
        } catch (err) {
            if (flushIntervals.current[modelId]) {
                clearInterval(flushIntervals.current[modelId]);
                delete flushIntervals.current[modelId];
            }
            setError(model.id, err instanceof Error ? err.message : String(err));
        }
    };

    // Cleanup intervals on unmount
    useEffect(() => {
        const intervals = flushIntervals.current;
        return () => {
            Object.values(intervals).forEach((interval) => {
                if (interval) clearInterval(interval);
            });
        };
    }, []);

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

        // Trigger API calls for each selected model
        const triggerApiCalls = async () => {
            await Promise.all(
                selectedModels.map(async (model: { id: string; provider: string; model: string }) => {
                    // Skip if already streaming or complete
                    // Use getState() to get fresh state, avoiding stale closure issues
                    const currentResponses = useStore.getState().responses;
                    const existingResponse = currentResponses.find((r) => r.modelId === model.id);
                    if (existingResponse?.isStreaming || existingResponse?.isComplete) {
                        return;
                    }
                    await streamModel(model.id);
                }),
            );
        };

        void triggerApiCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- streamModel uses refs and store.getState() to avoid stale closures
    }, [
        completeStep,
        hasHydrated,
        prompt,
        router,
        setCurrentStep,
        selectedModels,
        skipRedirectRef,
    ]);

    return { retryModel: streamModel };
}
