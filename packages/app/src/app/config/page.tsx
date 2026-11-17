/**
 * Config Page (T153-T156)
 *
 * Step 1 of the 4-step workflow: Mode Configuration
 * User selects operating mode (Free or Pro) and, in Free mode, configures
 * API keys and OpenAI-compatible endpoints (local or hosted)
 */

'use client';

import { PageHero } from '@/components/organisms/PageHero';
import { ModeSelector } from '@/components/organisms/ModeSelector';
import { ApiKeyConfiguration } from '@/components/organisms/ApiKeyConfiguration';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { InlineAlert } from '@/components/atoms/InlineAlert';
import { EmbeddingsProviderSelector } from '@/components/molecules/EmbeddingsProviderSelector';
import { EndpointConfiguration } from '@/components/organisms/EndpointConfiguration';
import { useConfigPage } from './hooks/useConfigPage';
import { useHasHydrated } from '~/hooks/useHasHydrated';
import { useEmbeddingsProviderSetting } from './hooks/useEmbeddingsProviderSetting';
import {
  useEmbeddingProviderStatuses,
  useEndpointConfiguration,
} from './hooks/useEndpointConfiguration';

export default function ConfigPage() {
  const {
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
    hydratedStatuses,
  } = useConfigPage();
  const hasHydrated = useHasHydrated();
  const isFreeModeActive = displayMode === 'free' && webCryptoSupported;
  const embeddings = useEmbeddingsProviderSetting(
    useEmbeddingProviderStatuses(hydratedStatuses, hasHydrated),
  );
  const endpointConfig = useEndpointConfiguration(isFreeModeActive && hasHydrated);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ProgressSteps
        currentStep={currentStep}
        fallbackStep="config"
        onStepClick={handleProgressStepClick}
      />

      <PageHero
        title={t('pages.config.title')}
        description={t('pages.config.description')}
      />

      <div className="mt-8">
        <ModeSelector
          selectedMode={displayMode}
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

      {displayMode === 'free' && (
        <div className="mt-8 space-y-6">
          <InlineAlert variant="info">
            <div>
              <p className="text-base font-semibold">
                {t('pages.config.securityNoticeTitle')}
              </p>
              <p className="mt-1">
                {t('pages.config.securityNoticeDescription')}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>{t('pages.config.securityNoticeBulletNeverLeavesBrowser')}</li>
                <li>{t('pages.config.securityNoticeBulletAesEncryption')}</li>
                <li>{t('pages.config.securityNoticeBulletNoServerStorage')}</li>
                <li>{t('pages.config.securityNoticeBulletDirectApiCalls')}</li>
              </ul>
            </div>
          </InlineAlert>

          <ApiKeyConfiguration
            items={displayApiKeyItems}
            configuredCountOverride={configuredCountOverride}
            onKeyChange={handleKeyChange}
            onToggleShow={handleToggleShow}
          />

          <EndpointConfiguration
            endpoints={endpointConfig.items}
            presets={endpointConfig.presets}
            onAdd={endpointConfig.onAdd}
            onChange={endpointConfig.onChange}
            onRemove={endpointConfig.onRemove}
          />

          <div className="rounded-lg border border-border p-6">
            <EmbeddingsProviderSelector
              value={embeddings.value}
              available={embeddings.available}
              activeProvider={embeddings.activeProvider}
              onChange={embeddings.onChange}
            />
          </div>
        </div>
      )}

      <div className="mt-12">
        <WorkflowNavigator
          currentStep={currentStep}
          onContinue={handleContinue}
          continueDisabled={!allowContinue}
          continueLabel={t('common.next')}
        />
      </div>
    </div>
  );
}
