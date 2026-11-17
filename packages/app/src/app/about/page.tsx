/**
 * About page: why Ensemble exists, what the agreement score can and cannot
 * tell you, who it is for, and published research on combining models,
 * framed by the claims rule in docs/PRODUCT_VISION.md. Links to the
 * benchmarks for our own results.
 */

"use client";

import { useTranslation } from "react-i18next";
import { ArrowRight, ExternalLink } from "lucide-react";
import { PageIntro } from "@/components/molecules/PageIntro";
import { FeatureGrid } from "@/components/molecules/FeatureGrid";
import { WORKSPACE_PATH } from "~/lib/workspaceRoutes";
import {
  ButtonLink,
  PUBLIC_CONTAINER,
  useItems,
} from "../_components/PublicPage";

interface Paper {
  title: string;
  authors: string;
  venue: string;
  finding: string;
  url: string;
}

export default function AboutPage() {
  const { t } = useTranslation("common");
  const key = "pages.about";
  const section = `${PUBLIC_CONTAINER} py-section`;
  const papers = t(`${key}.research.papers`, { returnObjects: true });

  return (
    <div data-testid="about-page">
      <div className={`${PUBLIC_CONTAINER} pb-section pt-10 md:pt-16`}>
        <PageIntro
          eyebrow={t(`${key}.eyebrow`)}
          title={t(`${key}.title`)}
          lead={t(`${key}.lead`)}
        >
          <ButtonLink href={WORKSPACE_PATH} testId="about-workspace-link">
            {t("pages.features.openWorkspace")}{" "}
            <ArrowRight aria-hidden="true" />
          </ButtonLink>
        </PageIntro>
      </div>
      <div className="border-y border-border bg-card">
        <div className={`${section} grid gap-10 md:grid-cols-2`}>
          {(["problem", "score"] as const).map((part) => (
            <section key={part} data-testid={`about-${part}`}>
              <h2 className="font-display text-title font-normal">
                {t(`${key}.${part}.heading`)}
              </h2>
              <p className="mt-3 text-label text-muted-foreground">
                {t(`${key}.${part}.body`)}
              </p>
            </section>
          ))}
        </div>
      </div>
      <FeatureGrid
        testId="about-audience"
        heading={t(`${key}.audience.heading`)}
        items={useItems(`${key}.audience.items`)}
        className={section}
      />
      <section
        data-testid="about-research-section"
        className={`${section} border-t border-border`}
      >
        <h2 className="font-display text-title font-normal">
          {t(`${key}.research.heading`)}
        </h2>
        <p className="mt-3 max-w-2xl text-label text-muted-foreground">
          {t(`${key}.research.intro`)}
        </p>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {(Array.isArray(papers) ? (papers as Paper[]) : []).map((paper) => (
            <li key={paper.url}>
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="about-paper"
                className="group flex items-start justify-between gap-4 py-4 focus-ring"
              >
                <span className="min-w-0">
                  <span className="block text-label font-medium group-hover:text-primary">
                    {paper.title}
                  </span>
                  <span className="mt-1 block text-caption text-muted-foreground">
                    {paper.authors}, {paper.venue}. {paper.finding}
                  </span>
                </span>
                <ExternalLink
                  className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>
        <a
          href="/benchmarks"
          data-testid="about-benchmarks-link"
          className="mt-6 inline-block rounded text-label font-medium text-primary underline decoration-primary/40 underline-offset-4 focus-ring hover:decoration-primary"
        >
          {t(`${key}.benchmarksLink`)}
        </a>
      </section>
    </div>
  );
}
