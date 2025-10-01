/**
 * Config Page
 *
 * Step 1 of the 4-step workflow: Mode Configuration
 * User selects operating mode (Free or Pro)
 */

'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '~/store';
import { PageHero } from '@/components/organisms/PageHero';
import { ModeSelector } from '@/components/organisms/ModeSelector';
import { WorkflowNavigator } from '@/components/organisms/WorkflowNavigator';

export default function ConfigPage() {
  const router = useRouter();

  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const isModeConfigured = useStore((state) => state.isModeConfigured);
  const configureModeComplete = useStore((state) => state.configureModeComplete);

  const currentStep = useStore((state) => state.currentStep);
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const completeStep = useStore((state) => state.completeStep);

  const handleSelectFreeMode = () => {
    setMode('free');
    configureModeComplete();
  };

  const handleSelectProMode = () => {
    setMode('pro');
    configureModeComplete();
  };

  const handleContinue = () => {
    completeStep('config');
    setCurrentStep('ensemble');
    router.push('/ensemble');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PageHero
        title="Configuration"
        description="Choose your operating mode to get started with AI Ensemble"
      />

      <div className="mt-8">
        <ModeSelector
          selectedMode={mode}
          onSelectFreeMode={handleSelectFreeMode}
          onSelectProMode={handleSelectProMode}
        />
      </div>

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
