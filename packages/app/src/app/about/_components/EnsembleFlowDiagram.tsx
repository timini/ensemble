/**
 * EnsembleFlowDiagram — CSS-based visual showing prompt → models → consensus.
 */

"use client";

import { useTranslation } from "react-i18next";
import { MessageSquare, Cpu, GitMerge, ArrowRight } from "lucide-react";
import { Text } from "@/components/atoms/Text";

const MODEL_LABELS = ["OpenAI", "Anthropic", "Google", "xAI", "Perplexity"];

const COLORS = [
  "bg-success/15 text-success border-success/30",
  "bg-warning/15 text-warning border-warning/30",
  "bg-info/15 text-info border-info/30",
  "bg-accent text-accent-foreground border-accent-foreground/30",
  "bg-primary/15 text-primary border-primary/30",
];

export function EnsembleFlowDiagram() {
  const { t } = useTranslation("common");

  return (
    <div
      className="rounded-lg border border-border bg-muted/20 px-4 py-6"
      data-testid="ensemble-flow-diagram"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
        {/* Step 1: Prompt */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <Text variant="caption" className="font-medium">
            {t("pages.about.flow.prompt")}
          </Text>
        </div>

        {/* Arrow */}
        <ArrowRight className="hidden h-5 w-5 text-muted-foreground sm:block" />
        <div className="h-5 w-px bg-border sm:hidden" />

        {/* Step 2: Models */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-2">
            {MODEL_LABELS.map((label, i) => (
              <div
                key={label}
                data-testid="model-chip"
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${COLORS[i % COLORS.length]}`}
              >
                <Cpu className="h-3.5 w-3.5" />
                {label}
              </div>
            ))}
          </div>
          <Text variant="caption" className="font-medium">
            {t("pages.about.flow.models")}
          </Text>
        </div>

        {/* Arrow */}
        <ArrowRight className="hidden h-5 w-5 text-muted-foreground sm:block" />
        <div className="h-5 w-px bg-border sm:hidden" />

        {/* Step 3: Consensus */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GitMerge className="h-6 w-6 text-primary" />
          </div>
          <Text variant="caption" className="font-medium">
            {t("pages.about.flow.consensus")}
          </Text>
        </div>
      </div>
    </div>
  );
}
