"use client";

import { OnboardingSheet } from "@/components/organisms/OnboardingSheet";
import { isProEnabled } from "~/lib/pro/proEnabled";
import {
  OllamaDetectedNotice,
  type OllamaDetectedNoticeProps,
} from "@/components/molecules/OllamaDetectedNotice";
import type { useOnboarding } from "../hooks/useOnboarding";
import type { CreditNoticeProps } from "@/components/molecules/CreditNotice";
import { useAuth } from "~/app/_components/AuthProvider";
import { ProPanel } from "./ProPanels";

export interface WorkspaceOnboardingProps {
  onboarding: ReturnType<typeof useOnboarding>;
  /** The Ollama offer (M2 detection), shown on the local path. */
  ollamaOffer: OllamaDetectedNoticeProps | null;
  /** The Pro balance, shown on the Pro path once signed in. */
  proBalance?: CreditNoticeProps | null;
}

/**
 * The first-run onboarding sheet of the workspace, fed by useOnboarding.
 * The local path shows the same Ollama offer as settings.
 */
export function WorkspaceOnboarding({
  onboarding,
  ollamaOffer,
  proBalance = null,
}: WorkspaceOnboardingProps) {
  const auth = useAuth();
  // Without sign-in and the Pro opt-in on this server, Pro shows as coming soon.
  const pro =
    auth.status === "unavailable" || !isProEnabled()
      ? undefined
      : { panel: <ProPanel balance={proBalance} /> };
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
      pro={pro}
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
