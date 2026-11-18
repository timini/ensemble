"use client";

import { useTranslation } from "react-i18next";
import { SharedRun } from "@/components/organisms/SharedRun";
import type { SharedRun as SharedRunData } from "~/lib/share/sharedRun";
import { toSharedRunView } from "~/lib/share/sharedRunView";
import { formatShareDate } from "~/lib/share/shareLinks";
import { WORKSPACE_PATH } from "~/lib/workspaceRoutes";
import { PUBLIC_CONTAINER } from "~/app/_components/PublicPage";

export interface SharedRunViewProps {
  run: SharedRunData;
  /** When the link was created, in epoch milliseconds. */
  createdAt: number;
  /** When the link stops working, in epoch milliseconds. */
  expiresAt: number;
}

/** The SharedRun organism for a stored share, with dates in the reader's language. */
export function SharedRunView({
  run,
  createdAt,
  expiresAt,
}: SharedRunViewProps) {
  const { i18n } = useTranslation();
  const view = toSharedRunView(run);
  return (
    <div className={`${PUBLIC_CONTAINER} py-10 md:py-14`}>
      <SharedRun
        prompt={run.prompt}
        sharedOn={formatShareDate(createdAt, i18n.language)}
        expiresOn={formatShareDate(expiresAt, i18n.language)}
        agreement={view.agreement}
        consensus={view.consensus}
        answers={view.answers}
        ctaHref={WORKSPACE_PATH}
      />
    </div>
  );
}
