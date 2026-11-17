/**
 * Features page: what Ensemble does, where models can come from, how keys
 * and prompts are kept private, Free and Pro, and what we can and cannot
 * claim yet (the claims rule in docs/PRODUCT_VISION.md), with links to the
 * workspace and the benchmarks.
 */

"use client";

import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { PageIntro } from "@/components/molecules/PageIntro";
import { FeatureGrid } from "@/components/molecules/FeatureGrid";
import { WORKSPACE_PATH } from "~/lib/workspaceRoutes";
import {
  ButtonLink,
  PUBLIC_CONTAINER,
  useItems,
} from "../_components/PublicPage";

export default function FeaturesPage() {
  const { t } = useTranslation("common");
  const key = "pages.features";
  const section = `${PUBLIC_CONTAINER} py-section`;

  return (
    <div data-testid="features-page">
      <div className={`${PUBLIC_CONTAINER} pb-section pt-10 md:pt-16`}>
        <PageIntro
          eyebrow={t(`${key}.eyebrow`)}
          title={t(`${key}.title`)}
          lead={t(`${key}.lead`)}
        >
          <ButtonLink href={WORKSPACE_PATH} testId="features-workspace-link">
            {t(`${key}.openWorkspace`)} <ArrowRight aria-hidden="true" />
          </ButtonLink>
          <ButtonLink
            href="/benchmarks"
            variant="outline"
            testId="features-benchmarks-link"
          >
            {t(`${key}.seeBenchmarks`)}
          </ButtonLink>
        </PageIntro>
      </div>
      <FeatureGrid
        testId="features-core"
        heading={t(`${key}.core.heading`)}
        items={useItems(`${key}.core.items`)}
        className={section}
      />
      <div className="border-y border-border bg-card">
        <FeatureGrid
          testId="features-models"
          heading={t(`${key}.models.heading`)}
          intro={t(`${key}.models.intro`)}
          items={useItems(`${key}.models.items`)}
          className={section}
        />
      </div>
      <FeatureGrid
        testId="features-privacy"
        heading={t(`${key}.privacy.heading`)}
        items={useItems(`${key}.privacy.items`)}
        className={section}
      />
      <FeatureGrid
        testId="features-modes"
        heading={t(`${key}.modes.heading`)}
        items={useItems(`${key}.modes.items`)}
        columns={2}
        className={`${section} pt-0`}
      />
      <div className="border-t border-border bg-card">
        <section
          data-testid="features-claims"
          className={`${section} grid gap-6 md:grid-cols-[1fr_1.4fr]`}
        >
          <h2 className="font-display text-title font-normal">
            {t(`${key}.claims.heading`)}
          </h2>
          <div className="space-y-4">
            <p className="text-label text-muted-foreground">
              {t(`${key}.claims.body`)}
            </p>
            <a
              href="/benchmarks"
              data-testid="features-claims-benchmarks"
              className="inline-block rounded text-label font-medium text-primary underline decoration-primary/40 underline-offset-4 focus-ring hover:decoration-primary"
            >
              {t(`${key}.seeBenchmarks`)}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
