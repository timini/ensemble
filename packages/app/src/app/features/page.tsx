/**
 * Features Page
 *
 * Showcases Ensemble AI's unique differentiators, technical capabilities,
 * 4-step workflow, operating modes, model ecosystem, and security.
 */

'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Settings, Users, MessageSquare, BarChart3, ArrowRight } from 'lucide-react';
import { PageHero } from '@/components/organisms/PageHero';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';
import { Card, CardContent } from '@/components/atoms/Card';
import { DifferentiatorsSection } from './_components/DifferentiatorsSection';
import { CapabilitiesSection } from './_components/CapabilitiesSection';
import { ModesSection } from './_components/ModesSection';
import { ModelsSection } from './_components/ModelsSection';
import { SecuritySection } from './_components/SecuritySection';

import type { Differentiator } from './_components/DifferentiatorsSection';
import type { Capability } from './_components/CapabilitiesSection';
import type { ModeInfo } from './_components/ModesSection';
import type { ProviderModel } from './_components/ModelsSection';

interface WorkflowStep {
  name: string;
  description: string;
}

const STEP_ICONS = [Settings, Users, MessageSquare, BarChart3];

export default function FeaturesPage() {
  const { t } = useTranslation('common');

  const steps = t('pages.features.howItWorks.steps', {
    returnObjects: true,
  }) as WorkflowStep[];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" data-testid="features-page">
      <PageHero
        title={t('pages.features.title')}
        description={t('pages.features.description')}
      />

      <DifferentiatorsSection
        heading={t('pages.features.differentiators.heading')}
        items={t('pages.features.differentiators.items', { returnObjects: true }) as Differentiator[]}
      />

      <CapabilitiesSection
        heading={t('pages.features.capabilities.heading')}
        items={t('pages.features.capabilities.items', { returnObjects: true }) as Capability[]}
      />

      {/* How It Works */}
      <section className="mt-16" data-testid="features-how-it-works-section">
        <Heading level={2} size="2xl" className="text-center mb-8">
          {t('pages.features.howItWorks.heading')}
        </Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {steps.map((step, i) => {
            const StepIcon = STEP_ICONS[i] ?? Settings;
            return (
              <Card key={i} className="relative overflow-hidden">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <StepIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {i + 1}
                        </Badge>
                        <Heading level={3} size="md">{step.name}</Heading>
                      </div>
                      <Text variant="helper">{step.description}</Text>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <ModesSection
        heading={t('pages.features.modes.heading')}
        freeMode={t('pages.features.modes.free', { returnObjects: true }) as ModeInfo}
        proMode={t('pages.features.modes.pro', { returnObjects: true }) as ModeInfo}
      />

      <ModelsSection
        heading={t('pages.features.models.heading')}
        body={t('pages.features.models.body')}
        providers={t('pages.features.models.providers', { returnObjects: true }) as ProviderModel[]}
      />

      <SecuritySection
        heading={t('pages.features.security.heading')}
        body={t('pages.features.security.body')}
        features={t('pages.features.security.features', { returnObjects: true }) as string[]}
      />

      {/* CTA */}
      <div className="mt-12 text-center">
        <Link
          href="/about"
          data-testid="about-cta-link"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          {t('pages.about.title')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
