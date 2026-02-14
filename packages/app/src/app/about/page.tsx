/**
 * About Page
 *
 * Static informational page explaining what an ensemble is,
 * why ensemble approaches work, and the academic research behind it.
 */

'use client';

import { useTranslation } from 'react-i18next';
import { PageHero } from '@/components/organisms/PageHero';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import { Link } from '@/components/atoms/Link';

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
      <section className="mt-12 space-y-4" data-testid="about-what-section">
        <Heading level={2} size="2xl">
          {t('pages.about.whatIsEnsemble.heading')}
        </Heading>
        <Text>{t('pages.about.whatIsEnsemble.body')}</Text>
      </section>

      {/* Why an Ensemble? */}
      <section className="mt-12 space-y-4" data-testid="about-why-section">
        <Heading level={2} size="2xl">
          {t('pages.about.whyEnsemble.heading')}
        </Heading>
        <Text>{t('pages.about.whyEnsemble.body')}</Text>
      </section>

      {/* The Research */}
      <section className="mt-12 space-y-4" data-testid="about-research-section">
        <Heading level={2} size="2xl">
          {t('pages.about.research.heading')}
        </Heading>
        <Text>{t('pages.about.research.intro')}</Text>
        <ul className="space-y-6">
          {papers.map((paper, i) => (
            <li key={i} className="border-l-2 border-primary pl-4">
              <Link href={paper.url} external variant="bold">
                {paper.title}
              </Link>
              <Text variant="helper" className="mt-1">
                {paper.authors} — {paper.venue}
              </Text>
              <Text variant="small" className="mt-1">
                {paper.finding}
              </Text>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
