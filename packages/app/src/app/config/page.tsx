/**
 * Config Page (T153-T156)
 *
 * Step 1 of the 4-step workflow: Mode Configuration
 * User selects operating mode (Free or Pro) and configures API keys if Free
 */

'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useStore } from '~/store';
import { PageHero } from '@/components/organisms/PageHero';
import { ModeSelector } from '@/components/organisms/ModeSelector';
import { ApiKeyConfiguration } from '@/components/organisms/ApiKeyConfiguration';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import type { Provider } from '@/components/molecules/ApiKeyInput';

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

  const handleSelectFreeMode = () => {
    setMode('free');
  };

  const handleSelectProMode = () => {
    setMode('pro');
    configureModeComplete();
  };

  const handleKeyChange = (provider: Provider, value: string) => {
    setApiKey(provider, value);
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
      helperText: 'Enter your OpenAI API key',
      validationStatus: apiKeys.openai?.key ? ('valid' as const) : ('idle' as const),
      showKey: apiKeys.openai?.visible ?? false,
    },
    {
      provider: 'anthropic' as Provider,
      label: 'Anthropic API Key',
      value: apiKeys.anthropic?.key ?? '',
      placeholder: 'sk-ant-...',
      helperText: 'Enter your Anthropic API key',
      validationStatus: apiKeys.anthropic?.key ? ('valid' as const) : ('idle' as const),
      showKey: apiKeys.anthropic?.visible ?? false,
    },
    {
      provider: 'google' as Provider,
      label: 'Google (Gemini) API Key',
      value: apiKeys.google?.key ?? '',
      placeholder: 'AIza...',
      helperText: 'Enter your Google AI API key',
      validationStatus: apiKeys.google?.key ? ('valid' as const) : ('idle' as const),
      showKey: apiKeys.google?.visible ?? false,
    },
    {
      provider: 'xai' as Provider,
      label: 'xAI (Grok) API Key',
      value: apiKeys.xai?.key ?? '',
      placeholder: 'xai-...',
      helperText: 'Enter your xAI API key',
      validationStatus: apiKeys.xai?.key ? ('valid' as const) : ('idle' as const),
      showKey: apiKeys.xai?.visible ?? false,
    },
  ] : [];

  // For Free mode, all 4 API keys must be configured
  const allKeysConfigured = mode === 'free'
    ? apiKeys.openai?.key && apiKeys.anthropic?.key && apiKeys.google?.key && apiKeys.xai?.key
    : false;

  // Call configureModeComplete when all keys are configured
  if (mode === 'free' && allKeysConfigured && !isModeConfigured) {
    configureModeComplete();
  }

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
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700">
              💡 {t('pages.config.apiKeyInfo')}
            </p>
          </div>
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
