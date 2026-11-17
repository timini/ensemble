"use client";

import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import {
  OllamaDetectedNotice,
  type OllamaDetectedNoticeProps,
} from "@/components/molecules/OllamaDetectedNotice";

/** Heading above the composer before the first run. */
export function WorkspaceHeading() {
  const { t } = useTranslation("common");
  return (
    <div data-testid="workspace-heading" className="space-y-2 text-center">
      <h1 className="font-display text-title font-normal tracking-tight">
        {t("pages.workspace.title")}
      </h1>
      <p className="text-body text-muted-foreground">
        {t("pages.workspace.subtitle")}
      </p>
    </div>
  );
}

export interface SetupCardProps {
  onOpenSettings: () => void;
  /** The Ollama offer, when a local Ollama was found or can be looked for. */
  ollamaOffer: OllamaDetectedNoticeProps | null;
}

/**
 * Shown until a key or an endpoint works: one sentence on what to add and a
 * button into settings. The Ollama offer sits under it, so a user with
 * Ollama running starts with one click.
 */
export function SetupCard({ onOpenSettings, ollamaOffer }: SetupCardProps) {
  const { t } = useTranslation("common");
  return (
    <div className="space-y-3">
      <section
        data-testid="workspace-setup"
        className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-card/60 p-5 sm:flex-row sm:items-center"
      >
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-label font-semibold">
            {t("pages.workspace.setupTitle")}
          </h2>
          <p className="text-caption text-muted-foreground">
            {t("pages.workspace.setupBody")}
          </p>
        </div>
        <Button
          onClick={onOpenSettings}
          data-testid="workspace-setup-open"
          className="shrink-0"
        >
          {t("pages.workspace.setupAction")}
        </Button>
      </section>
      {ollamaOffer && <OllamaDetectedNotice {...ollamaOffer} />}
    </div>
  );
}

/** Example questions under the composer before the first run. A click fills the prompt. */
export function ExampleQuestions({
  onPick,
}: {
  onPick: (question: string) => void;
}) {
  const { t } = useTranslation("common");
  const examples = t("pages.workspace.examples", {
    returnObjects: true,
  }) as string[];
  return (
    <section data-testid="workspace-examples" className="space-y-2">
      <h2 className="text-caption font-medium uppercase tracking-wider text-muted-foreground">
        {t("pages.workspace.examplesHeading")}
      </h2>
      <ul className="flex flex-col gap-2">
        {(Array.isArray(examples) ? examples : []).map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => onPick(question)}
              data-testid="workspace-example"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-label transition-colors duration-fast focus-ring hover:bg-muted"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
