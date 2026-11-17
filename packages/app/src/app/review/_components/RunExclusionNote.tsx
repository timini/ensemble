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
}

/**
 * Tells the user how failed models affect the run: which answers consensus
 * and agreement leave out, or, with fewer than two usable answers, why no
 * consensus can be made.
 */
export function RunExclusionNote({
  succeeded,
  total,
  failedModels,
  manualCount = 0,
  finished,
}: RunExclusionNoteProps) {
  const { t } = useTranslation();

  if (finished && total > 0 && succeeded + manualCount < 2) {
    return (
      <div className="mt-8" data-testid="consensus-insufficient">
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
    <div className="mt-8" data-testid="run-exclusion-note">
      <InlineAlert variant="info">
        {t("pages.review.runExclusionNote", {
          count: failedModels.length,
          models: failedModels.join(", "),
          succeeded,
          total,
        })}
      </InlineAlert>
    </div>
  );
}
