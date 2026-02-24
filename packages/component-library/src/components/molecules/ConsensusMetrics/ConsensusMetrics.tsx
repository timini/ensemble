import * as React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "../../atoms/Progress";
import { Text } from "../../atoms/Text";
import { cn } from "../../../lib/utils";

export interface ConsensusMetricsProps {
  /** Number of rounds needed to reach consensus */
  roundsToConsensus: number;
  /** Final agreement percentage (0-100) */
  finalAgreement: number;
  /** Whether consensus was unanimous */
  unanimousConsensus: boolean;
  /** Maximum number of council rounds */
  maxRounds: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ConsensusMetrics molecule for displaying council consensus outcomes.
 *
 * Shows rounds-to-consensus progress, final agreement level, and whether
 * consensus was unanimous.
 *
 * @example
 * ```tsx
 * <ConsensusMetrics
 *   roundsToConsensus={3}
 *   finalAgreement={82}
 *   unanimousConsensus={false}
 *   maxRounds={5}
 * />
 * ```
 */
export const ConsensusMetrics = React.forwardRef<
  HTMLDivElement,
  ConsensusMetricsProps
>(
  (
    {
      roundsToConsensus,
      finalAgreement,
      unanimousConsensus,
      maxRounds,
      className,
    },
    ref,
  ) => {
    const { t } = useTranslation();

    const safeMaxRounds = Math.max(1, Math.floor(maxRounds));
    const safeRounds = Math.min(
      Math.max(Math.floor(roundsToConsensus), 0),
      safeMaxRounds,
    );
    const safeAgreement = Math.min(
      Math.max(Math.round(finalAgreement), 0),
      100,
    );

    const agreementLevel =
      safeAgreement >= 80
        ? { key: "high", color: "text-success" }
        : safeAgreement >= 50
          ? { key: "medium", color: "text-warning" }
          : { key: "low", color: "text-destructive" };

    const roundsVariant =
      safeRounds <= Math.ceil(safeMaxRounds / 2)
        ? "success"
        : safeRounds < safeMaxRounds
          ? "warning"
          : "destructive";

    return (
      <div
        ref={ref}
        data-testid="consensus-metrics"
        className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3", className)}
      >
        <div className="border-border bg-card rounded-lg border p-4">
          <Text variant="small" color="muted">
            {t("molecules.consensusMetrics.roundsLabel")}
          </Text>
          <Text className="text-foreground mt-1 text-xl font-semibold">
            {t("molecules.consensusMetrics.roundsValue", {
              rounds: safeRounds,
              maxRounds: safeMaxRounds,
            })}
          </Text>
          <Progress
            value={safeRounds}
            max={safeMaxRounds}
            variant={roundsVariant}
            className="mt-3"
            data-testid="consensus-metrics-rounds-progress"
          />
        </div>

        <div className="border-border bg-card rounded-lg border p-4">
          <Text variant="small" color="muted">
            {t("molecules.consensusMetrics.finalAgreementLabel")}
          </Text>
          <div
            className={cn("mt-1 text-xl font-semibold", agreementLevel.color)}
            data-testid="consensus-metrics-agreement"
            data-agreement-level={agreementLevel.key}
          >
            {safeAgreement}%
          </div>
          <Text variant="small" className={cn("mt-3", agreementLevel.color)}>
            {t(`molecules.consensusMetrics.agreement.${agreementLevel.key}`)}
          </Text>
        </div>

        <div className="border-border bg-card rounded-lg border p-4">
          <Text variant="small" color="muted">
            {t("molecules.consensusMetrics.unanimousLabel")}
          </Text>
          <div
            className={cn(
              "mt-2 flex items-center gap-2 text-xl font-semibold",
              unanimousConsensus ? "text-success" : "text-destructive",
            )}
            data-testid="consensus-metrics-unanimous"
            data-unanimous={unanimousConsensus ? "true" : "false"}
          >
            {unanimousConsensus ? (
              <CheckCircle2
                className="h-5 w-5"
                aria-label={t("molecules.consensusMetrics.unanimousYes")}
              />
            ) : (
              <XCircle
                className="h-5 w-5"
                aria-label={t("molecules.consensusMetrics.unanimousNo")}
              />
            )}
            <span>
              {unanimousConsensus
                ? t("molecules.consensusMetrics.unanimousYes")
                : t("molecules.consensusMetrics.unanimousNo")}
            </span>
          </div>
        </div>
      </div>
    );
  },
);

ConsensusMetrics.displayName = "ConsensusMetrics";
