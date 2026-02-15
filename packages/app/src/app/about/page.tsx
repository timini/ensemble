/**
 * About Page
 *
 * Static informational page explaining what an ensemble is,
 * why ensemble approaches work, and the academic research behind it.
 */

"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import {
  Brain,
  Shuffle,
  BookOpen,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { PageHero } from "@/components/organisms/PageHero";
import { Heading } from "@/components/atoms/Heading";
import { Text } from "@/components/atoms/Text";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Card, CardHeader, CardContent } from "@/components/atoms/Card";

interface ResearchPaper {
  title: string;
  authors: string;
  venue: string;
  finding: string;
  url: string;
}

export default function AboutPage() {
  const { t } = useTranslation("common");

  const papers = t("pages.about.research.papers", {
    returnObjects: true,
  }) as ResearchPaper[];

  return (
    <div
      className="container mx-auto max-w-4xl px-4 py-8"
      data-testid="about-page"
    >
      <PageHero
        title={t("pages.about.title")}
        description={t("pages.about.description")}
      />

      {/* What is Ensemble AI? */}
      <section className="mt-12" data-testid="about-what-section">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <Heading level={2} size="xl">
                {t("pages.about.whatIsEnsemble.heading")}
              </Heading>
            </div>
          </CardHeader>
          <CardContent>
            <Text className="leading-relaxed">
              {t("pages.about.whatIsEnsemble.body")}
            </Text>
          </CardContent>
        </Card>
      </section>

      {/* Why an Ensemble? */}
      <section className="mt-8" data-testid="about-why-section">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shuffle className="h-5 w-5 text-primary" />
              </div>
              <Heading level={2} size="xl">
                {t("pages.about.whyEnsemble.heading")}
              </Heading>
            </div>
          </CardHeader>
          <CardContent>
            <Text className="leading-relaxed">
              {t("pages.about.whyEnsemble.body")}
            </Text>
          </CardContent>
        </Card>
      </section>

      {/* The Research */}
      <section className="mt-8" data-testid="about-research-section">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <Heading level={2} size="xl">
            {t("pages.about.research.heading")}
          </Heading>
        </div>
        <Text className="mb-6 leading-relaxed" color="muted">
          {t("pages.about.research.intro")}
        </Text>
        <div className="space-y-4">
          {papers.map((paper) => (
            <a
              key={paper.url}
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline">{paper.venue}</Badge>
                        <Text variant="caption" as="span">
                          {paper.authors}
                        </Text>
                      </div>
                      <Text className="font-semibold transition-colors group-hover:text-primary">
                        {paper.title}
                      </Text>
                      <Text variant="helper" className="mt-2">
                        {paper.finding}
                      </Text>
                    </div>
                    <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>

      {/* Bottom CTAs */}
      <div
        className="mt-12 space-y-4 text-center"
        data-testid="about-bottom-cta"
      >
        <div>
          <Button asChild size="lg">
            <Link href="/config">
              {t("app.seeItInAction")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div>
          <Link
            href="/features"
            data-testid="features-cta-link"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            {t("pages.features.title")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
