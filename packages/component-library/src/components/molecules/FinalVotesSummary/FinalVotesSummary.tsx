import * as React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { Progress } from "../../atoms/Progress";
import { Text } from "../../atoms/Text";
import { cn } from "../../../lib/utils";

interface FinalVote {
  modelId: string;
  decision: string;
  reasoning: string;
  confidence: number;
}

interface VoteResponseReference {
  modelId: string;
  modelName: string;
  provider: string;
}

export interface FinalVotesSummaryProps {
  /** Final votes cast by each council member */
  votes: FinalVote[];
  /** Response metadata used to resolve model/provider display names */
  responses: VoteResponseReference[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * FinalVotesSummary molecule for displaying per-model council votes.
 *
 * Renders each model's final decision, confidence bar, and expandable
 * reasoning content.
 */
export const FinalVotesSummary = React.forwardRef<
  HTMLDivElement,
  FinalVotesSummaryProps
>(({ votes, responses, className }, ref) => {
  const { t } = useTranslation();
  const [expandedVoteIds, setExpandedVoteIds] = React.useState<Set<string>>(
    new Set(),
  );

  const responseMap = React.useMemo(
    () => new Map(responses.map((response) => [response.modelId, response])),
    [responses],
  );

  const toggleReasoning = (modelId: string) => {
    setExpandedVoteIds((previous) => {
      const next = new Set(previous);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  const getConfidenceVariant = (confidence: number) => {
    if (confidence >= 80) {
      return { variant: "success", color: "text-success" } as const;
    }
    if (confidence >= 50) {
      return { variant: "warning", color: "text-warning" } as const;
    }
    return { variant: "destructive", color: "text-destructive" } as const;
  };

  if (votes.length === 0) {
    return (
      <div
        ref={ref}
        data-testid="final-votes-summary"
        className={cn(
          "border-border bg-card text-muted-foreground rounded-lg border p-4 text-sm",
          className,
        )}
      >
        {t("molecules.finalVotesSummary.noVotes")}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-testid="final-votes-summary"
      className={cn("space-y-3", className)}
    >
      {votes.map((vote, index) => {
        const metadata = responseMap.get(vote.modelId);
        const modelName = metadata?.modelName ?? vote.modelId;
        const providerName =
          metadata?.provider != null
            ? t(`providers.${metadata.provider}`, {
                defaultValue: metadata.provider,
              })
            : t("molecules.finalVotesSummary.unknownProvider");

        const safeConfidence = Math.min(
          Math.max(Math.round(vote.confidence), 0),
          100,
        );
        const confidenceStyle = getConfidenceVariant(safeConfidence);
        const isExpanded = expandedVoteIds.has(vote.modelId);

        return (
          <div
            key={`${vote.modelId}-${index}`}
            data-testid={`final-vote-item-${vote.modelId}`}
            className="border-border bg-card rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{modelName}</Badge>
                <Text variant="caption" color="muted">
                  {providerName}
                </Text>
              </div>

              <div className="text-right">
                <Text variant="caption" color="muted">
                  {t("molecules.finalVotesSummary.confidenceLabel")}
                </Text>
                <div
                  className={cn("text-sm font-semibold", confidenceStyle.color)}
                >
                  {safeConfidence}%
                </div>
              </div>
            </div>

            <Text
              className="text-foreground mt-3 text-sm font-semibold"
              data-testid={`final-vote-decision-${vote.modelId}`}
            >
              {vote.decision}
            </Text>

            <Progress
              value={safeConfidence}
              max={100}
              variant={confidenceStyle.variant}
              className="mt-2"
              data-testid={`final-vote-confidence-${vote.modelId}`}
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-auto px-0 py-0 text-sm"
              onClick={() => toggleReasoning(vote.modelId)}
              aria-expanded={isExpanded}
              data-testid={`final-vote-toggle-${vote.modelId}`}
            >
              {isExpanded ? (
                <ChevronUp className="mr-1 h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="mr-1 h-4 w-4" aria-hidden="true" />
              )}
              {isExpanded
                ? t("molecules.finalVotesSummary.hideReasoning")
                : t("molecules.finalVotesSummary.showReasoning")}
            </Button>

            {isExpanded ? (
              <Text
                variant="small"
                className="text-muted-foreground mt-2"
                data-testid={`final-vote-reasoning-${vote.modelId}`}
              >
                {vote.reasoning}
              </Text>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});

FinalVotesSummary.displayName = "FinalVotesSummary";
