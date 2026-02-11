/**
 * Config Page (T153-T156)
 *
 * Step 1 of the 4-step workflow: Mode Configuration
 * User selects operating mode (Free or Pro) and configures API keys if Free
 */

'use client';

import { PageHero } from '@/components/organisms/PageHero';
import { ModeSelector } from '@/components/organisms/ModeSelector';
import { ApiKeyConfiguration } from '@/components/organisms/ApiKeyConfiguration';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';
import { ProgressSteps } from '@/components/molecules/ProgressSteps';
import { InlineAlert } from '@/components/atoms/InlineAlert';
import { ProModeAuthGate } from '@/components/organisms/ProModeAuthGate';
import { useConfigPage } from './hooks/useConfigPage';
import { signInWithGoogle, signInWithGitHub, signOut } from '~/lib/auth';

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
    allowContinue,
    authStatus,
    authUser,
  } = useConfigPage();

  const proModeAuthStatus =
    authStatus === 'authenticated'
      ? 'authenticated'
      : authStatus === 'loading'
        ? 'loading'
        : 'unauthenticated';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ProgressSteps currentStep={currentStep} fallbackStep="config" />

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
        <div className="mt-8">
          <ApiKeyConfiguration
            items={displayApiKeyItems}
            configuredCountOverride={configuredCountOverride}
            onKeyChange={handleKeyChange}
            onToggleShow={handleToggleShow}
          />
        </div>
      )}

      {displayMode === 'pro' && (
        <div className="mt-8">
          <ProModeAuthGate
            authStatus={proModeAuthStatus}
            user={authUser}
            onSignInWithGoogle={() => void signInWithGoogle()}
            onSignInWithGitHub={() => void signInWithGitHub()}
            onSignOut={() => void signOut()}
          />
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
