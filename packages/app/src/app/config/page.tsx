/**
 * Config Page (T153-T156)
 *
 * Step 1 of the 4-step workflow: Mode Configuration
 * User selects operating mode (Free or Pro) and configures API keys if Free
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { PageHero } from '@/components/organisms/PageHero';
import { ModeSelector } from '@/components/organisms/ModeSelector';
import { ApiKeyConfiguration } from '@/components/organisms/ApiKeyConfiguration';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import type { Provider } from '@/components/molecules/ApiKeyInput';
import type { ValidationStatus } from '@/components/molecules/ApiKeyInput';
import { ProviderRegistry } from '~/providers/ProviderRegistry';

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

  const handleSelectFreeMode = () => {
    setMode('free');
  };

  const handleSelectProMode = () => {
    setMode('pro');
    configureModeComplete();
  };

  // Validate API key using provider (using mock mode for validation)
  const validateApiKey = useCallback(async (provider: Provider, apiKey: string, currentMode: string) => {
    if (!apiKey || apiKey.length === 0) {
      setValidationStatus(prev => ({ ...prev, [provider]: 'idle' }));
      return;
    }

    // Only validate in Free mode
    if (currentMode !== 'free') {
      return;
    }

    // Set validating status
    setValidationStatus(prev => ({ ...prev, [provider]: 'validating' }));

    try {
      const providerRegistry = ProviderRegistry.getInstance();
      // Use 'mock' mode for validation (simulates network call with random delay)
      const providerInstance = providerRegistry.getProvider(provider, 'mock');

      const result = await providerInstance.validateApiKey(apiKey);

      setValidationStatus(prev => ({
        ...prev,
        [provider]: result.valid ? 'valid' : 'invalid'
      }));
    } catch (error) {
      console.error(`Error validating ${provider} API key:`, error);
      setValidationStatus(prev => ({ ...prev, [provider]: 'invalid' }));
    }
  }, []);

  const handleKeyChange = (provider: Provider, value: string) => {
    setApiKey(provider, value);

    // Clear existing timeout for this provider
    if (timeoutRefs.current[provider]) {
      clearTimeout(timeoutRefs.current[provider]);
    }

    // Validate after a short debounce (500ms)
    timeoutRefs.current[provider] = setTimeout(() => {
      void validateApiKey(provider, value, mode);
    }, 500);
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
  const apiKeyItems = mode === 'free' ? [
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

  // Count configured API keys
  const configuredKeysCount = mode === 'free'
    ? [apiKeys.openai?.key, apiKeys.anthropic?.key, apiKeys.google?.key, apiKeys.xai?.key].filter(Boolean).length
    : 0;

  // At least 1 API key configured enables Continue button
  const hasConfiguredKeys = configuredKeysCount > 0;

  // Call configureModeComplete when at least 1 key is configured
  useEffect(() => {
    if (mode === 'free' && hasConfiguredKeys && !isModeConfigured) {
      configureModeComplete();
    }
  }, [mode, hasConfiguredKeys, isModeConfigured, configureModeComplete]);

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
      <PageHero
        title={t('pages.config.title')}
        description={t('pages.config.description')}
      />

      <div className="mt-8">
        <ModeSelector
          selectedMode={mode}
          onSelectFreeMode={handleSelectFreeMode}
          onSelectProMode={handleSelectProMode}
          proModeDisabled
        />
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
          continueDisabled={!isModeConfigured}
        />
      </div>
    </div>
  );
}
