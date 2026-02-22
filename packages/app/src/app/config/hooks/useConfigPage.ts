import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { useHasHydrated } from '~/hooks/useHasHydrated';
import { useStepNavigation } from '~/hooks/useStepNavigation';
import { useApiKeyAutoHide } from './useApiKeyAutoHide';
import type { OperatingMode } from '~/store/slices/modeSlice';
import type { Provider, ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { validateApiKey, createDebouncedValidator } from '~/lib/validation';
import { isWebCryptoAvailable } from '@ensemble-ai/shared-utils/security';
import { toError } from '~/lib/errors';
import { getHydratedStatus } from '~/lib/providerStatus';
import { logger } from '~/lib/logger';

const PROVIDERS: Provider[] = ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'perplexity'];

export function useConfigPage() {
    const { t } = useTranslation('common');
    const router = useRouter();
    const handleProgressStepClick = useStepNavigation();

    const mode = useStore((state) => state.mode);
    const setMode = useStore((state) => state.setMode);
    const apiKeys = useStore((state) => state.apiKeys);
    const setApiKey = useStore((state) => state.setApiKey);
    const toggleApiKeyVisibility = useStore((state) => state.toggleApiKeyVisibility);
    const isModeConfigured = useStore((state) => state.isModeConfigured);
    const configureModeComplete = useStore((state) => state.configureModeComplete);

    const currentStep = useStore((state) => state.currentStep);
    const setCurrentStep = useStore((state) => state.setCurrentStep);
    const completeStep = useStore((state) => state.completeStep);

    const setApiKeyStatus = useStore((state) => state.setApiKeyStatus);

    // Store timeout IDs for debouncing
    const timeoutRefs = useRef<Record<Provider, NodeJS.Timeout | null>>({
        openai: null,
        anthropic: null,
        google: null,
        xai: null,
        deepseek: null,
        perplexity: null,
    });
    const { resetAutoHideTimer } = useApiKeyAutoHide();
    const [webCryptoSupported, setWebCryptoSupported] = useState(true);

    const handleSelectFreeMode = () => {
        if (!webCryptoSupported) {
            return;
        }
        setMode('free');
    };

    const handleSelectProMode = () => {
        setMode('pro');
        configureModeComplete();
    };

    // Handler for validation status changes
    const validationStatus = useMemo(
        () => ({
            openai: apiKeys.openai?.status ?? 'idle',
            anthropic: apiKeys.anthropic?.status ?? 'idle',
            google: apiKeys.google?.status ?? 'idle',
            xai: apiKeys.xai?.status ?? 'idle',
            deepseek: apiKeys.deepseek?.status ?? 'idle',
            perplexity: apiKeys.perplexity?.status ?? 'idle',
        }),
        [apiKeys],
    );
    const hasHydrated = useHasHydrated();
    const displayMode: OperatingMode = hasHydrated ? mode : 'free';
    const hydratedStatuses = useMemo(
        () => getHydratedStatus(hasHydrated, validationStatus),
        [hasHydrated, validationStatus],
    );

    const handleValidationStatusChange = useCallback(
        (provider: Provider, status: ValidationStatus, error?: string) => {
            setApiKeyStatus(provider, status, error);
        },
        [setApiKeyStatus],
    );

    // Create debounced validator using the reusable utility
    const debouncedValidate = createDebouncedValidator(
        timeoutRefs,
        validateApiKey
    );

    // Validate any pre-populated API keys on initial render or when keys change
    useEffect(() => {
        setWebCryptoSupported(isWebCryptoAvailable());
    }, []);

    useEffect(() => {
        if (mode !== 'free' || !webCryptoSupported) {
            return;
        }

        PROVIDERS.forEach((provider) => {
            const existingKey = apiKeys[provider]?.key ?? '';
            if (existingKey.length === 0) {
                return;
            }

            if (validationStatus[provider] === 'idle') {
                void validateApiKey({
                    provider,
                    apiKey: existingKey,
                    userMode: mode,
                    onStatusChange: handleValidationStatusChange,
                });
            }
        });
    }, [apiKeys, handleValidationStatusChange, mode, validationStatus, webCryptoSupported]);

    const handleKeyChange = (provider: Provider, value: string) => {
        void setApiKey(provider, value).catch((error: unknown) => {
            logger.error(
                `Failed to store ${provider} API key`,
                toError(error, `Unable to store ${provider} API key`),
            );
        });
        debouncedValidate(provider, value, mode, handleValidationStatusChange);
        resetAutoHideTimer();
    };

    const handleToggleShow = (provider: Provider) => {
        toggleApiKeyVisibility(provider);
    };

    const handleContinue = () => {
        logger.debug('handleContinue clicked');
        completeStep('config');
        setCurrentStep('ensemble');
        router.push('/ensemble');
    };

    // Prepare API key configuration items for Free mode
    const isFreeModeActive = displayMode === 'free' && webCryptoSupported;

    const apiKeyItems = useMemo(() => {
        if (!isFreeModeActive) {
            return [];
        }

        return [
            {
                provider: 'openai' as Provider,
                label: 'OpenAI API Key',
                value: apiKeys.openai?.key ?? '',
                placeholder: 'sk-...',
                helperText: hydratedStatuses.openai === 'valid' ? 'API key configured' : hydratedStatuses.openai === 'validating' ? 'Validating...' : hydratedStatuses.openai === 'invalid' ? 'Invalid API key' : 'Enter your OpenAI API key',
                error: apiKeys.openai?.error,
                validationStatus: hydratedStatuses.openai,
                showKey: apiKeys.openai?.visible ?? false,
            },
            {
                provider: 'anthropic' as Provider,
                label: 'Anthropic API Key',
                value: apiKeys.anthropic?.key ?? '',
                placeholder: 'sk-ant-...',
                helperText: hydratedStatuses.anthropic === 'valid' ? 'API key configured' : hydratedStatuses.anthropic === 'validating' ? 'Validating...' : hydratedStatuses.anthropic === 'invalid' ? 'Invalid API key' : 'Enter your Anthropic API key',
                error: apiKeys.anthropic?.error,
                validationStatus: hydratedStatuses.anthropic,
                showKey: apiKeys.anthropic?.visible ?? false,
            },
            {
                provider: 'google' as Provider,
                label: 'Google (Gemini) API Key',
                value: apiKeys.google?.key ?? '',
                placeholder: 'AIza...',
                helperText: hydratedStatuses.google === 'valid' ? 'API key configured' : hydratedStatuses.google === 'validating' ? 'Validating...' : hydratedStatuses.google === 'invalid' ? 'Invalid API key' : 'Enter your Google AI API key',
                error: apiKeys.google?.error,
                validationStatus: hydratedStatuses.google,
                showKey: apiKeys.google?.visible ?? false,
            },
            {
                provider: 'xai' as Provider,
                label: 'xAI (Grok) API Key',
                value: apiKeys.xai?.key ?? '',
                placeholder: 'xai-...',
                helperText: hydratedStatuses.xai === 'valid' ? 'API key configured' : hydratedStatuses.xai === 'validating' ? 'Validating...' : hydratedStatuses.xai === 'invalid' ? 'Invalid API key' : 'Enter your xAI API key',
                error: apiKeys.xai?.error,
                validationStatus: hydratedStatuses.xai,
                showKey: apiKeys.xai?.visible ?? false,
            },
            {
                provider: 'deepseek' as Provider,
                label: 'DeepSeek API Key',
                value: apiKeys.deepseek?.key ?? '',
                placeholder: 'sk-...',
                helperText: hydratedStatuses.deepseek === 'valid' ? 'API key configured' : hydratedStatuses.deepseek === 'validating' ? 'Validating...' : hydratedStatuses.deepseek === 'invalid' ? 'Invalid API key' : 'Enter your DeepSeek API key',
                error: apiKeys.deepseek?.error,
                validationStatus: hydratedStatuses.deepseek,
                showKey: apiKeys.deepseek?.visible ?? false,
            },
            {
                provider: 'perplexity' as Provider,
                label: 'Perplexity API Key',
                value: apiKeys.perplexity?.key ?? '',
                placeholder: 'pplx-...',
                helperText: hydratedStatuses.perplexity === 'valid' ? 'API key configured' : hydratedStatuses.perplexity === 'validating' ? 'Validating...' : hydratedStatuses.perplexity === 'invalid' ? 'Invalid API key' : 'Enter your Perplexity API key',
                error: apiKeys.perplexity?.error,
                validationStatus: hydratedStatuses.perplexity,
                showKey: apiKeys.perplexity?.visible ?? false,
            },
        ];
    }, [apiKeys, hydratedStatuses, isFreeModeActive]);

    const displayApiKeyItems = useMemo(() => {
        if (hasHydrated) {
            return apiKeyItems;
        }
        return apiKeyItems.map((item) => ({
            ...item,
            value: '',
            helperText: t('organisms.apiKeyConfiguration.apiKeyInfoNormal'),
            validationStatus: 'idle' as ValidationStatus,
            showKey: false,
        }));
    }, [apiKeyItems, hasHydrated, t]);

    // Count validated API keys (Free mode only)
    const configuredKeysCount = isFreeModeActive
        ? PROVIDERS.filter((provider) => hydratedStatuses[provider] === 'valid').length
        : 0;
    const configuredCountOverride = hasHydrated ? configuredKeysCount : 0;

    // At least 1 API key validated enables Continue button in Free mode
    const hasValidKeys = configuredKeysCount > 0;
    const allowContinue = useMemo(() => {
        if (!hasHydrated) {
            return false;
        }
        const allowed = isFreeModeActive ? hasValidKeys : isModeConfigured;
        logger.debug(`ConfigPage: allowContinue=${allowed} (hasValidKeys=${hasValidKeys}, isModeConfigured=${isModeConfigured})`);
        return allowed;
    }, [hasHydrated, isFreeModeActive, hasValidKeys, isModeConfigured]);

    // Call configureModeComplete when at least 1 key is configured
    useEffect(() => {
        if (isFreeModeActive && hasValidKeys && !isModeConfigured) {
            configureModeComplete();
        }
    }, [isFreeModeActive, hasValidKeys, isModeConfigured, configureModeComplete]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        const timeouts = timeoutRefs.current;
        return () => {
            Object.values(timeouts).forEach((timeout) => {
                if (timeout) clearTimeout(timeout);
            });
        };
    }, []);

    return {
        t,
        currentStep,
        displayMode,
        webCryptoSupported,
        handleSelectFreeMode,
        handleSelectProMode,
        displayApiKeyItems,
        configuredCountOverride,
        handleKeyChange,
        handleToggleShow,
        handleContinue,
        handleProgressStepClick,
        allowContinue,
    };
}
