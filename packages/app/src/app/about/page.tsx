/**
 * About Page
 *
 * Static informational page explaining what an ensemble is,
 * why ensemble approaches work, and the academic research behind it.
 */

'use client';

import { useTranslation } from 'react-i18next';
import {
  Brain,
  Shuffle,
  BookOpen,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { PageHero } from '@/components/organisms/PageHero';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';
import {
  Card,
  CardHeader,
  CardContent,
} from '@/components/atoms/Card';

interface ResearchPaper {
  title: string;
  authors: string;
  venue: string;
  finding: string;
  url: string;
}

export default function AboutPage() {
  const { t } = useTranslation('common');

  const papers = t('pages.about.research.papers', {
    returnObjects: true,
  }) as ResearchPaper[];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" data-testid="about-page">
      <PageHero
        title={t('pages.about.title')}
        description={t('pages.about.description')}
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
                {t('pages.about.whatIsEnsemble.heading')}
              </Heading>
            </div>
          </CardHeader>
          <CardContent>
            <Text className="leading-relaxed">
              {t('pages.about.whatIsEnsemble.body')}
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
                {t('pages.about.whyEnsemble.heading')}
              </Heading>
            </div>
          </CardHeader>
          <CardContent>
            <Text className="leading-relaxed">
              {t('pages.about.whyEnsemble.body')}
            </Text>
          </CardContent>
        </Card>
      </section>

      {/* The Research */}
      <section className="mt-8" data-testid="about-research-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <Heading level={2} size="xl">
            {t('pages.about.research.heading')}
          </Heading>
        </div>
        <Text className="mb-6 leading-relaxed" color="muted">
          {t('pages.about.research.intro')}
        </Text>
        <div className="space-y-4">
          {papers.map((paper, i) => (
            <a
              key={i}
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{paper.venue}</Badge>
                        <Text variant="caption" as="span">
                          {paper.authors}
                        </Text>
                      </div>
                      <Text className="font-semibold group-hover:text-primary transition-colors">
                        {paper.title}
                      </Text>
                      <Text variant="helper" className="mt-2">
                        {paper.finding}
                      </Text>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>

      {/* CTA to Features */}
      <div className="mt-12 text-center">
        <a
          href="/features"
          data-testid="features-cta-link"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          {t('pages.features.title')}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
