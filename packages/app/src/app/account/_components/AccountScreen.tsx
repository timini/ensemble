"use client";

import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/organisms/AppShell";
import { AccountDashboard } from "@/components/organisms/AccountDashboard";
import { useAuth } from "~/app/_components/AuthProvider";
import { AccountMenuContainer } from "~/app/_components/AccountMenuContainer";
import { ProSignInCard } from "~/app/workspace/_components/ProPanels";
import { useAccountDashboard } from "~/hooks/useAccountDashboard";
import { WORKSPACE_PATH } from "~/lib/workspaceRoutes";

function WorkspaceNavLink() {
  const { t } = useTranslation("common");
  return (
    <a
      href={WORKSPACE_PATH}
      data-testid="account-workspace-link"
      className="rounded-md px-3 py-2 text-label text-muted-foreground transition-colors duration-fast focus-ring hover:text-foreground"
    >
      {t("pages.account.workspace")}
    </a>
  );
}

/** What the page shows before the dashboard: signing in, no sign-in here, loading. */
function AccountGate() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  if (auth.status === "loading") {
    return (
      <p
        data-testid="account-loading"
        aria-busy="true"
        className="flex items-center gap-2 text-label text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {t("pages.account.loading")}
      </p>
    );
  }
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-title font-normal">
          {t("pages.account.title")}
        </h1>
        <p className="text-label text-muted-foreground">
          {auth.status === "unavailable"
            ? t("pages.account.unavailable")
            : t("pages.account.signInLead")}
        </p>
      </header>
      {auth.status === "signedOut" && (
        <div className="max-w-md">
          <ProSignInCard />
        </div>
      )}
    </div>
  );
}

function SignedInDashboard() {
  const auth = useAuth();
  const dashboard = useAccountDashboard();
  return <AccountDashboard email={auth.user?.email} {...dashboard} />;
}

/**
 * The account page in the workspace's AppShell: the usage dashboard while
 * signed in (balance with buy buttons, usage by model, purchases, recent
 * runs), the sign-in panel while signed out.
 */
export function AccountScreen() {
  const auth = useAuth();
  return (
    <AppShell
      homeHref="/"
      nav={<WorkspaceNavLink />}
      account={<AccountMenuContainer />}
    >
      <div
        data-testid="account-page"
        className="mx-auto max-w-4xl px-gutter py-8"
      >
        {auth.status === "signedIn" ? <SignedInDashboard /> : <AccountGate />}
      </div>
    </AppShell>
  );
}
