/**
 * Features Page
 *
 * Static informational page covering product features: the 4-step workflow,
 * operating modes (Free & Pro), supported providers, and security & privacy.
 */

'use client';

import { useTranslation } from 'react-i18next';
import { PageHero } from '@/components/organisms/PageHero';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';

interface WorkflowStep {
  name: string;
  description: string;
}

interface ProviderInfo {
  name: string;
  description: string;
}

export default function FeaturesPage() {
  const { t } = useTranslation('common');

  const steps = t('pages.features.howItWorks.steps', {
    returnObjects: true,
  }) as WorkflowStep[];

  const securityFeatures = t('pages.features.security.features', {
    returnObjects: true,
  }) as string[];

  const providers = t('pages.features.providers.list', {
    returnObjects: true,
  }) as ProviderInfo[];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageHero
        title={t('pages.features.title')}
        description={t('pages.features.description')}
      />

      {/* How It Works */}
      <section className="mt-12 space-y-4">
        <Heading level={2} size="2xl">
          {t('pages.features.howItWorks.heading')}
        </Heading>
        <ol className="space-y-3 list-decimal list-inside">
          {steps.map((step, i) => (
            <li key={i} className="text-foreground">
              <span className="font-semibold">{step.name}</span>
              <span className="text-muted-foreground">
                {' '}
                — {step.description}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Operating Modes */}
      <section className="mt-12 space-y-6">
        <Heading level={2} size="2xl">
          {t('pages.features.modes.heading')}
        </Heading>
        <div>
          <Heading level={3} size="lg">
            {t('pages.features.modes.free.heading')}
          </Heading>
          <Text className="mt-2">{t('pages.features.modes.free.body')}</Text>
        </div>
        <div>
          <Heading level={3} size="lg">
            {t('pages.features.modes.pro.heading')}
          </Heading>
          <Text className="mt-2">{t('pages.features.modes.pro.body')}</Text>
        </div>
      </section>

      {/* Supported Providers */}
      <section className="mt-12 space-y-4">
        <Heading level={2} size="2xl">
          {t('pages.features.providers.heading')}
        </Heading>
        <Text>{t('pages.features.providers.body')}</Text>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {providers.map((provider, i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-4 bg-card"
            >
              <Heading level={3} size="md">
                {provider.name}
              </Heading>
              <Text variant="helper" className="mt-1">
                {provider.description}
              </Text>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="mt-12 space-y-4">
        <Heading level={2} size="2xl">
          {t('pages.features.security.heading')}
        </Heading>
        <Text>{t('pages.features.security.body')}</Text>
        <ul className="space-y-2 list-disc list-inside text-foreground">
          {securityFeatures.map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
