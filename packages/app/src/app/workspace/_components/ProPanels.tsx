"use client";

import { useTranslation } from "react-i18next";
import { SignInPanel } from "@/components/molecules/SignInPanel";
import {
  CreditNotice,
  type CreditNoticeProps,
} from "@/components/molecules/CreditNotice";
import { ModeSwitch } from "@/components/molecules/ModeSwitch";
import { useAuth } from "~/app/_components/AuthProvider";
import {
  AccountMenuContainer,
  signInPanelProps,
} from "~/app/_components/AccountMenuContainer";
import { useStore } from "~/store";

/** The usage dashboard (FR-041). */
export const ACCOUNT_PATH = "/account";

/** The sign-in panel with a line on why Pro needs an account. */
export function ProSignInCard() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  return (
    <section
      data-testid="pro-sign-in"
      className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <h2 className="text-label font-semibold">
        {t("pages.workspace.pro.signInTitle")}
      </h2>
      <p className="text-caption text-muted-foreground">
        {t("pages.workspace.pro.signInBody")}
      </p>
      <SignInPanel {...signInPanelProps(auth)} />
    </section>
  );
}

export interface ProPanelProps {
  /** The balance with buy buttons, once it has loaded. */
  balance: CreditNoticeProps | null;
}

/**
 * What Pro shows where it is chosen (settings, onboarding): the sign-in
 * panel when signed out, the balance once signed in.
 */
export function ProPanel({ balance }: ProPanelProps) {
  const auth = useAuth();
  if (auth.status === "signedOut")
    return <SignInPanel {...signInPanelProps(auth)} />;
  if (auth.status === "signedIn" && balance)
    return <CreditNotice {...balance} />;
  return null;
}

/**
 * Under the composer in Pro: the sign-in panel while signed out, otherwise
 * the credit notice (low balance, a run the balance cannot cover, unpriced
 * models, a balance that failed to load), if any.
 */
export function ProComposerNotice({
  notice,
}: {
  notice: CreditNoticeProps | null;
}) {
  const auth = useAuth();
  const pro = useStore((s) => s.mode === "pro");
  if (!pro) return null;
  if (auth.status === "signedOut") return <ProSignInCard />;
  return notice ? <CreditNotice {...notice} /> : null;
}

/**
 * The header account menu, with the credit balance while in Pro (FR-037)
 * and a link to the usage dashboard on /account.
 */
export function WorkspaceAccount({ balance }: ProPanelProps) {
  const { t } = useTranslation("common");
  const pro = useStore((s) => s.mode === "pro");
  return (
    <AccountMenuContainer>
      {pro && balance && <CreditNotice {...balance} />}
      <a
        href={ACCOUNT_PATH}
        data-testid="account-menu-dashboard-link"
        className="rounded-md text-label font-medium text-primary underline-offset-4 focus-ring hover:underline"
      >
        {t("pages.workspace.pro.accountLink")}
      </a>
    </AccountMenuContainer>
  );
}

/**
 * Free or Pro, in settings. Switching keeps presets, history and the
 * chosen models (FR-030); only where calls go changes.
 */
export function ModeSettings({ balance }: ProPanelProps) {
  const auth = useAuth();
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  return (
    <ModeSwitch
      mode={mode}
      onModeChange={setMode}
      proAvailable={auth.status !== "unavailable"}
      proPanel={<ProPanel balance={balance} />}
    />
  );
}
