"use client";

import { useTranslation } from "react-i18next";
import { InlineAlert } from "@/components/atoms/InlineAlert";

export interface RunExclusionNoteProps {
  /** Model answers that completed without an error. */
  succeeded: number;
  /** Models in the run. */
  total: number;
  /** Display names of the models whose answer failed. */
  failedModels: string[];
  /** Manual answers, which also count towards consensus. */
  manualCount?: number;
  /** True once no answer is still streaming. */
  finished: boolean;
  /**
   * False when no embeddings provider is available, so the run has no
   * agreement score to leave models out of. Defaults to true.
   */
  agreementAvailable?: boolean;
}

/**
 * Tells the user how failed models affect the run: which answers consensus
 * and agreement leave out, or, with fewer than two usable answers, why no
 * consensus can be made. The count of answers used appears only once the
 * run has finished, since it is not known before.
 */
export function RunExclusionNote({
  succeeded,
  total,
  failedModels,
  manualCount = 0,
  finished,
  agreementAvailable = true,
}: RunExclusionNoteProps) {
  const { t } = useTranslation();

  if (finished && total > 0 && succeeded + manualCount < 2) {
    return (
      <div data-testid="consensus-insufficient">
        <InlineAlert variant="warning">
          <p className="font-semibold">
            {t("pages.review.consensusInsufficientTitle")}
          </p>
          <p className="mt-1">
            {t("pages.review.consensusInsufficientDescription", {
              count: succeeded,
              total,
            })}
          </p>
        </InlineAlert>
      </div>
    );
  }

  if (failedModels.length === 0) return null;

  return (
    <div data-testid="run-exclusion-note">
      <InlineAlert variant="info">
        <p>
          {t(
            agreementAvailable
              ? "pages.review.runExclusionNote"
              : "pages.review.runExclusionNoteNoAgreement",
            { count: failedModels.length, models: failedModels.join(", ") },
          )}
        </p>
        {finished && (
          <p className="mt-1" data-testid="run-exclusion-count">
            {t(
              agreementAvailable
                ? "pages.review.runExclusionCount"
                : "pages.review.runExclusionCountNoAgreement",
              { succeeded, total },
            )}
          </p>
        )}
      </InlineAlert>
    </div>
  );
}
