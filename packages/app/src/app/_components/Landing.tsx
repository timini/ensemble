"use client";

import { useTranslation } from "react-i18next";
import { ExampleRun } from "@/components/organisms/ExampleRun";
import { WaysIn } from "@/components/molecules/WaysIn";
import { ScoreGuide } from "@/components/molecules/ScoreGuide";
import { HowItWorks } from "@/components/molecules/HowItWorks";
import recorded from "~/data/example-run.json";
import { exampleRunProps, type RecordedRun } from "~/lib/exampleRun";
import { WORKSPACE_PATH } from "~/lib/workspaceRoutes";
import { firebaseClientConfig } from "~/lib/auth/firebaseConfig";

/** Where each way in leads: the workspace, with onboarding on that path. */
export const LANDING_LINKS = {
  keys: `${WORKSPACE_PATH}?start=keys`,
  local: `${WORKSPACE_PATH}?start=local`,
  pro: `${WORKSPACE_PATH}?start=pro`,
  benchmarks: "/benchmarks",
} as const;

/**
 * The landing page: one sentence on what Ensemble does, a recorded run
 * (real answers, agreement score and consensus, no keys needed), the three
 * ways in, what the score means and how a run works. "Sign in for Pro"
 * opens the Pro onboarding path when sign-in is set up on this build, and
 * shows as coming soon otherwise. Copy follows the claims rule in
 * docs/PRODUCT_VISION.md.
 */
export function Landing() {
  const { t, i18n } = useTranslation("common");
  const example = exampleRunProps(
    recorded as RecordedRun,
    i18n.language === "fr" ? "fr" : "en",
  );
  return (
    <div data-testid="landing">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-gutter pb-section pt-10 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="space-y-6">
          <p className="text-caption font-medium uppercase tracking-wider text-primary">
            {t("pages.landing.eyebrow")}
          </p>
          <h1 className="text-balance font-display text-display">
            {t("pages.landing.title")}
          </h1>
          <p
            data-testid="landing-lead"
            className="max-w-xl text-lead text-muted-foreground"
          >
            {t("pages.landing.lead")}
          </p>
          <WaysIn
            keysHref={LANDING_LINKS.keys}
            localHref={LANDING_LINKS.local}
            proHref={firebaseClientConfig() ? LANDING_LINKS.pro : undefined}
          />
        </div>
        <ExampleRun {...example} />
      </section>
      <div className="border-y border-border bg-card">
        <ScoreGuide
          benchmarksHref={LANDING_LINKS.benchmarks}
          className="mx-auto max-w-6xl px-gutter py-section"
        />
      </div>
      <HowItWorks className="mx-auto max-w-6xl px-gutter py-section" />
    </div>
  );
}
