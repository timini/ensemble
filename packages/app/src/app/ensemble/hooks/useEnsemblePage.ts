import { useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import type { ProviderType } from '~/store/slices/ensembleSlice';
import type { OperatingMode } from '~/store/slices/modeSlice';
import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { validateApiKey, createDebouncedValidator } from '~/lib/validation';
import { getHydratedStatus, createProviderStatusLabels } from '~/lib/providerStatus';
import { useHasHydrated } from '~/hooks/useHasHydrated';
import { useManualResponseModal } from './useManualResponseModal';
import { useApiKeyModal } from './useApiKeyModal';
import { useAvailableModels } from './useAvailableModels';
import {
    EMPTY_API_KEYS,
    PRESETS,
    DEFAULT_ENSEMBLE_NAME,
} from '../page.constants';
import { logger } from '~/lib/logger';

export function useEnsemblePage() {
    const { t } = useTranslation('common');
    const router = useRouter();

    const mode = useStore((state) => state.mode);
    const apiKeys = useStore((state) => state.apiKeys);
    const setApiKey = useStore((state) => state.setApiKey);
    const toggleApiKeyVisibility = useStore((state) => state.toggleApiKeyVisibility);
    const setApiKeyStatus = useStore((state) => state.setApiKeyStatus);
    const selectedModels = useStore((state) => state.selectedModels);
    const addModel = useStore((state) => state.addModel);
    const removeModel = useStore((state) => state.removeModel);
    const summarizerModel = useStore((state) => state.summarizerModel);
    const setSummarizer = useStore((state) => state.setSummarizer);
    const addManualResponse = useStore((state) => state.addManualResponse);
    const manualResponses = useStore((state) => state.manualResponses);
    const clearSelection = useStore((state) => state.clearSelection);
    const hasHydrated = useHasHydrated();
    const displayMode: OperatingMode = hasHydrated ? mode : 'free';
    const safeApiKeys = hasHydrated ? apiKeys : EMPTY_API_KEYS;
    const viewManualResponses = hasHydrated ? manualResponses : [];

    const currentStep = useStore((state) => state.currentStep);
    const setCurrentStep = useStore((state) => state.setCurrentStep);
    const completeStep = useStore((state) => state.completeStep);

    const displayedSummarizer = hasHydrated ? summarizerModel ?? undefined : undefined;
    const viewSelectedModels = hasHydrated ? selectedModels : [];

    const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

    // Presets matching wireframe design
    const currentEnsembleName = DEFAULT_ENSEMBLE_NAME;

    // Modal state for API key configuration
    const manualModal = useManualResponseModal(t, addManualResponse);

    // Validation status derived from store
    const validationStatus = useMemo(
        () => ({
            openai: safeApiKeys.openai?.status ?? 'idle',
            anthropic: safeApiKeys.anthropic?.status ?? 'idle',
            google: safeApiKeys.google?.status ?? 'idle',
            xai: safeApiKeys.xai?.status ?? 'idle',
        }),
        [safeApiKeys],
    );

    const hydratedStatuses = useMemo(
        () => getHydratedStatus(hasHydrated, validationStatus),
        [hasHydrated, validationStatus],
    );

    const availableModels = useAvailableModels({
        hasHydrated,
        mode: displayMode,
        hydratedStatuses,
    });

    // Track selected model IDs for ModelSelectionList
    const selectedModelIds = selectedModels.map((m) => m.model);
    const displayedSelectedModelIds = hasHydrated ? selectedModelIds : [];

    const providerStatus = useMemo(
        () =>
            createProviderStatusLabels({
                mode: displayMode,
                statuses: validationStatus,
                hasHydrated,
            }),
        [displayMode, validationStatus, hasHydrated],
    );

    // Store timeout IDs for debouncing
    const timeoutRefs = useRef<Record<Provider, NodeJS.Timeout | null>>({
        openai: null,
        anthropic: null,
        google: null,
        xai: null,
    });

    // Handler for validation status changes
    const handleValidationStatusChange = (provider: Provider, status: ValidationStatus) => {
        setApiKeyStatus(provider as ProviderType, status);
    };

    // Create debounced validator using the reusable utility
    const debouncedValidate = createDebouncedValidator(
        timeoutRefs,
        validateApiKey
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _removeManualResponse = useStore((state) => state.removeManualResponse);
    const setConsensusMethod = useStore((state) => state.setConsensusMethod);
    const setEloTopN = useStore((state) => state.setEloTopN);
    const consensusMethod = useStore((state) => state.consensusMethod);
    const eloTopN = useStore((state) => state.eloTopN);

    const handleModelToggle = (modelId: string) => {
        if (!hasHydrated) {
            return;
        }
        // Find the available model first to get its name
        const availableModel = availableModels.find((m) => m.id === modelId);
        if (!availableModel) {
            return;
        }

        // Check if already selected by matching on the stored model API ID
        const selectedModel = selectedModels.find((m) => m.model === availableModel.id);

        if (selectedModel) {
            // Remove using the selected model's unique ID
            removeModel(selectedModel.id);
        } else {
            // Add model if under limit
            if (selectedModels.length < 6) {
                addModel(availableModel.provider, availableModel.id);
            }
        }
    };

    const handleConsensusMethodChange = (method: 'standard' | 'elo') => {
        setConsensusMethod(method);
    };

    const handleTopNChange = (n: number) => {
        setEloTopN(n);
    };

    const handleSummarizerChange = (modelId: string) => {
        if (!hasHydrated) {
            return;
        }
        setSummarizer(modelId);
    };

    const setEmbeddingsProvider = useStore((state) => state.setEmbeddingsProvider);

    const handleContinue = () => {
        // Ensure we have a valid embeddings provider selected
        const currentProvider = useStore.getState().embeddingsProvider;
        const currentProviderStatus = validationStatus[currentProvider];

        if (currentProviderStatus !== 'valid') {
            // Find first valid provider
            const validProvider = (Object.keys(validationStatus) as Provider[]).find(
                (p) => validationStatus[p] === 'valid'
            );

            if (validProvider) {
                setEmbeddingsProvider(validProvider as ProviderType);
            }
        }

        completeStep('ensemble');
        setCurrentStep('prompt');
        router.push('/prompt');
    };

    const handleBack = () => {
        setCurrentStep('config');
        router.push('/config');
    };

    // Placeholder handlers for EnsembleManagementPanel
    const handleLoadPreset = (presetId: string) => {
        logger.debug('Load preset:', presetId);
    };

    const handleSavePreset = (name: string) => {
        logger.debug('Save preset:', name);
    };

    const handleDeletePreset = (presetId: string) => {
        logger.debug('Delete preset:', presetId);
    };

    const apiKeyModal = useApiKeyModal({
        safeApiKeys,
        hydratedStatuses,
        mode,
        setApiKey,
        debouncedValidate,
        toggleApiKeyVisibility,
        onValidationStatusChange: handleValidationStatusChange,
    });

    // Cleanup timeouts on unmount
    useEffect(() => {
        const timeouts = timeoutRefs.current;
        return () => {
            Object.values(timeouts).forEach((timeout) => {
                if (timeout) clearTimeout(timeout);
            });
        };
    }, []);

    // Filter API key items to show only the selected provider
    // Map selected model metadata for the sidebar display
    const sidebarModels = viewSelectedModels.map((selection) => {
        const model = availableModels.find((m) => m.id === selection.model);
        return {
            id: selection.model,
            name: model?.name ?? selection.model,
        };
    });

    // Continue button enabled if 2-6 models selected
    const isValid =
        hasHydrated && selectedModels.length >= 2 && selectedModels.length <= 6;

    return {
        t,
        currentStep,
        availableModels,
        displayedSelectedModelIds,
        displayedSummarizer,
        providerStatus,
        isMockMode,
        handleModelToggle,
        handleSummarizerChange,
        apiKeyModal,
        sidebarModels,
        PRESETS,
        currentEnsembleName,
        handleLoadPreset,
        handleSavePreset,
        handleDeletePreset,
        manualModal,
        viewManualResponses,
        clearSelection,
        handleContinue,
        handleBack,
        isValid,
        handleConsensusMethodChange,
        handleTopNChange,
        consensusMethod,
        eloTopN,
    };
}
