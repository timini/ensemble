"use client";

import { OnboardingSheet } from "@/components/organisms/OnboardingSheet";
import {
  OllamaDetectedNotice,
  type OllamaDetectedNoticeProps,
} from "@/components/molecules/OllamaDetectedNotice";
import type { useOnboarding } from "../hooks/useOnboarding";

export interface WorkspaceOnboardingProps {
  onboarding: ReturnType<typeof useOnboarding>;
  /** The Ollama offer (M2 detection), shown on the local path. */
  ollamaOffer: OllamaDetectedNoticeProps | null;
}

/**
 * The first-run onboarding sheet of the workspace, fed by useOnboarding.
 * The local path shows the same Ollama offer as settings.
 */
export function WorkspaceOnboarding({
  onboarding,
  ollamaOffer,
}: WorkspaceOnboardingProps) {
  return (
    <OnboardingSheet
      open={onboarding.open}
      onOpenChange={onboarding.onOpenChange}
      path={onboarding.path}
      onPathChange={onboarding.onPathChange}
      keyField={onboarding.keyField}
      local={{
        notice: ollamaOffer ? (
          <OllamaDetectedNotice {...ollamaOffer} />
        ) : undefined,
        connected: onboarding.connected,
        onOpenSettings: onboarding.onOpenSettings,
      }}
      canStart={onboarding.canStart}
      onStart={() => {
        onboarding.onStart();
        // After the sheet has closed and handed focus back.
        setTimeout(() =>
          document
            .querySelector<HTMLElement>('[data-testid="composer-prompt"]')
            ?.focus(),
        );
      }}
      onSkip={onboarding.onSkip}
    />
  );
}
