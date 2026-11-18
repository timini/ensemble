"use client";

import { useTranslation } from "react-i18next";
import { ButtonLink, PUBLIC_CONTAINER } from "~/app/_components/PublicPage";
import { WORKSPACE_PATH } from "~/lib/workspaceRoutes";

/** A share link that has expired, was deleted or never existed. */
export default function SharedRunNotFound() {
  const { t } = useTranslation("common");
  return (
    <div
      data-testid="shared-run-missing"
      className={`${PUBLIC_CONTAINER} flex flex-col items-center py-24 text-center`}
    >
      <h1 className="mb-4 font-display text-title">
        {t("pages.sharedRun.missingTitle")}
      </h1>
      <p className="mb-8 max-w-md text-body text-muted-foreground">
        {t("pages.sharedRun.missingBody")}
      </p>
      <ButtonLink href={WORKSPACE_PATH} testId="shared-run-missing-cta">
        {t("pages.sharedRun.missingCta")}
      </ButtonLink>
    </div>
  );
}
