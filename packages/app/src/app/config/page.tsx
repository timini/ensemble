/**
 * Config Page (T153-T156)
 *
 * Step 1 of the 4-step workflow: Mode Configuration
 * User selects operating mode (Free or Pro) and configures API keys if Free
 */

'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { PageHero } from '@/components/organisms/PageHero';
import { ModeSelector } from '@/components/organisms/ModeSelector';
import { ApiKeyConfiguration } from '@/components/organisms/ApiKeyConfiguration';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import type { Provider } from '@/components/molecules/ApiKeyInput';
import type { ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { validateApiKey, createDebouncedValidator } from '~/lib/validation';
import { InlineAlert } from '@/components/atoms/InlineAlert';
import { isWebCryptoAvailable } from '@ensemble-ai/shared-utils/security';

const PROVIDERS: Provider[] = ['openai', 'anthropic', 'google', 'xai'];

export default function ConfigPage() {
  const { t } = useTranslation('common');
  const router = useRouter();

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

  // Validation state for each provider
  const [validationStatus, setValidationStatus] = useState<Record<Provider, ValidationStatus>>({
    openai: 'idle',
    anthropic: 'idle',
    google: 'idle',
    xai: 'idle',
  });

  // Store timeout IDs for debouncing
  const timeoutRefs = useRef<Record<Provider, NodeJS.Timeout | null>>({
    openai: null,
    anthropic: null,
    google: null,
    xai: null,
  });
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
  const handleValidationStatusChange = useCallback(
    (provider: Provider, status: ValidationStatus) => {
      setValidationStatus((prev) => ({ ...prev, [provider]: status }));
    },
    [],
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
    void setApiKey(provider, value).catch((error) => {
      console.error(`Failed to store ${provider} API key`, error);
    });
    debouncedValidate(provider, value, mode, handleValidationStatusChange);
  };

  const handleToggleShow = (provider: Provider) => {
    toggleApiKeyVisibility(provider);
  };

  const handleContinue = () => {
    completeStep('config');
    setCurrentStep('ensemble');
    router.push('/ensemble');
  };

  // Prepare API key configuration items for Free mode
  const isFreeModeActive = mode === 'free' && webCryptoSupported;

  const apiKeyItems = isFreeModeActive ? [
    {
      provider: 'openai' as Provider,
      label: 'OpenAI API Key',
      value: apiKeys.openai?.key ?? '',
      placeholder: 'sk-...',
      helperText: validationStatus.openai === 'valid' ? 'API key configured' : validationStatus.openai === 'validating' ? 'Validating...' : 'Enter your OpenAI API key',
      validationStatus: validationStatus.openai,
      showKey: apiKeys.openai?.visible ?? false,
    },
    {
      provider: 'anthropic' as Provider,
      label: 'Anthropic API Key',
      value: apiKeys.anthropic?.key ?? '',
      placeholder: 'sk-ant-...',
      helperText: validationStatus.anthropic === 'valid' ? 'API key configured' : validationStatus.anthropic === 'validating' ? 'Validating...' : 'Enter your Anthropic API key',
      validationStatus: validationStatus.anthropic,
      showKey: apiKeys.anthropic?.visible ?? false,
    },
    {
      provider: 'google' as Provider,
      label: 'Google (Gemini) API Key',
      value: apiKeys.google?.key ?? '',
      placeholder: 'AIza...',
      helperText: validationStatus.google === 'valid' ? 'API key configured' : validationStatus.google === 'validating' ? 'Validating...' : 'Enter your Google AI API key',
      validationStatus: validationStatus.google,
      showKey: apiKeys.google?.visible ?? false,
    },
    {
      provider: 'xai' as Provider,
      label: 'xAI (Grok) API Key',
      value: apiKeys.xai?.key ?? '',
      placeholder: 'xai-...',
      helperText: validationStatus.xai === 'valid' ? 'API key configured' : validationStatus.xai === 'validating' ? 'Validating...' : 'Enter your xAI API key',
      validationStatus: validationStatus.xai,
      showKey: apiKeys.xai?.visible ?? false,
    },
  ] : [];

  // Count validated API keys (Free mode only)
  const configuredKeysCount = isFreeModeActive
    ? PROVIDERS.filter((provider) => validationStatus[provider] === 'valid').length
    : 0;

  // At least 1 API key validated enables Continue button in Free mode
  const hasValidKeys = configuredKeysCount > 0;
  const hasHydrated = useHasHydrated();
  const allowContinue = useMemo(() => {
    if (!hasHydrated) {
      return false;
    }
    return isFreeModeActive ? hasValidKeys : isModeConfigured;
  }, [hasHydrated, isFreeModeActive, hasValidKeys, isModeConfigured]);

  // Set current step to 'config' on mount
  useEffect(() => {
    setCurrentStep('config');
  }, [setCurrentStep]);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ProgressSteps currentStep={currentStep} fallbackStep="config" />

      <PageHero
        title={t('pages.config.title')}
        description={t('pages.config.description')}
      />

      <div className="mt-8">
      <ModeSelector
        selectedMode={mode}
        onSelectFreeMode={handleSelectFreeMode}
        onSelectProMode={handleSelectProMode}
        freeModeDisabled={!webCryptoSupported}
        proModeDisabled
      />

      {!webCryptoSupported && (
        <div className="mt-6">
          <InlineAlert variant="error">
            <p className="font-semibold">
              {t('pages.config.webCryptoUnsupportedTitle')}
            </p>
            <p className="mt-1">
              {t('pages.config.webCryptoUnsupportedDescription')}
            </p>
          </InlineAlert>
        </div>
      )}
      </div>

      {mode === 'free' && (
        <div className="mt-8">
          <ApiKeyConfiguration
            items={apiKeyItems}
            onKeyChange={handleKeyChange}
            onToggleShow={handleToggleShow}
          />
        </div>
      )}

      <div className="mt-12">
        <WorkflowNavigator
          currentStep={currentStep}
          onContinue={handleContinue}
          continueDisabled={!allowContinue}
        />
      </div>
    </div>
  );
}

function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
