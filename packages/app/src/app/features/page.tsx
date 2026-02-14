/**
 * Features Page
 *
 * Showcases Ensemble AI's unique differentiators, technical capabilities,
 * 4-step workflow, operating modes, model ecosystem, and security.
 */

'use client';

import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  GitBranch,
  UserPlus,
  Layers,
  Zap,
  Shield,
  Unlock,
  Settings,
  Users,
  MessageSquare,
  BarChart3,
  Key,
  CreditCard,
  Check,
  ArrowRight,
} from 'lucide-react';
import { PageHero } from '@/components/organisms/PageHero';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';
import { Card, CardHeader, CardContent } from '@/components/atoms/Card';

interface Differentiator {
  title: string;
  body: string;
  metrics: string[];
}

interface Capability {
  number: string;
  label: string;
  description: string;
}

interface WorkflowStep {
  name: string;
  description: string;
}

interface ModeInfo {
  heading: string;
  badge: string;
  body: string;
  features: string[];
}

interface ProviderModel {
  name: string;
  models: string;
}

const DIFF_ICONS = [TrendingUp, GitBranch, UserPlus];
const DIFF_COLORS = [
  'bg-green-500/10 text-green-600 dark:text-green-400',
  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'bg-purple-500/10 text-purple-600 dark:text-purple-400',
];
const CAP_ICONS = [Layers, Zap, Shield, Unlock];
const STEP_ICONS = [Settings, Users, MessageSquare, BarChart3];
const PROVIDER_COLORS = [
  'bg-green-500/10 text-green-600 dark:text-green-400',
  'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'bg-purple-500/10 text-purple-600 dark:text-purple-400',
];

export default function FeaturesPage() {
  const { t } = useTranslation('common');

  const differentiators = t('pages.features.differentiators.items', {
    returnObjects: true,
  }) as Differentiator[];
  const capabilities = t('pages.features.capabilities.items', {
    returnObjects: true,
  }) as Capability[];
  const steps = t('pages.features.howItWorks.steps', {
    returnObjects: true,
  }) as WorkflowStep[];
  const freeMode = t('pages.features.modes.free', {
    returnObjects: true,
  }) as ModeInfo;
  const proMode = t('pages.features.modes.pro', {
    returnObjects: true,
  }) as ModeInfo;
  const providers = t('pages.features.models.providers', {
    returnObjects: true,
  }) as ProviderModel[];
  const securityFeatures = t('pages.features.security.features', {
    returnObjects: true,
  }) as string[];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl" data-testid="features-page">
      <PageHero
        title={t('pages.features.title')}
        description={t('pages.features.description')}
      />

      {/* Differentiators */}
      <section className="mt-16" data-testid="features-differentiators-section">
        <Heading level={2} size="2xl" className="text-center mb-8">
          {t('pages.features.differentiators.heading')}
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {differentiators.map((item, i) => {
            const Icon = DIFF_ICONS[i] ?? TrendingUp;
            return (
              <Card key={i} className="border-2 hover:border-primary/50 transition-all">
                <CardContent className="pt-6">
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${DIFF_COLORS[i]}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <Heading level={3} size="md" className="text-center mb-2">
                    {item.title}
                  </Heading>
                  <Text variant="helper" className="text-center mb-4">
                    {item.body}
                  </Text>
                  <div className="flex flex-wrap justify-center gap-2">
                    {item.metrics.map((m, j) => (
                      <Badge key={j} variant="outline" className="text-xs">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Capabilities */}
      <section className="mt-16" data-testid="features-capabilities-section">
        <Card className="bg-muted/30">
          <CardContent className="pt-8 pb-8">
            <Heading level={2} size="2xl" className="text-center mb-8">
              {t('pages.features.capabilities.heading')}
            </Heading>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {capabilities.map((cap, i) => {
                const Icon = CAP_ICONS[i] ?? Layers;
                return (
                  <div key={i} className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary mb-1">{cap.number}</div>
                    <Heading level={3} size="sm">{cap.label}</Heading>
                    <Text variant="caption" className="mt-1">{cap.description}</Text>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

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

      {/* Operating Modes */}
      <section className="mt-16" data-testid="features-modes-section">
        <Heading level={2} size="2xl" className="text-center mb-8">
          {t('pages.features.modes.heading')}
        </Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { mode: freeMode, icon: Key, border: 'border-primary/30' },
            { mode: proMode, icon: CreditCard, border: '' },
          ].map(({ mode, icon: ModeIcon, border }, i) => (
            <Card key={i} className={border}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ModeIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Heading level={3} size="lg">{mode.heading}</Heading>
                    <Badge variant={i === 0 ? 'outline' : 'default'} className="mt-1">
                      {mode.badge}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Text variant="helper" className="leading-relaxed mb-4">
                  {mode.body}
                </Text>
                <ul className="space-y-2">
                  {mode.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                      <Text variant="small">{f}</Text>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Model Ecosystem */}
      <section className="mt-16" data-testid="features-models-section">
        <Heading level={2} size="2xl" className="text-center mb-2">
          {t('pages.features.models.heading')}
        </Heading>
        <Text className="text-center mb-8" color="muted">
          {t('pages.features.models.body')}
        </Text>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {providers.map((provider, i) => (
            <Card key={i}>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${PROVIDER_COLORS[i]}`}>
                    <Heading level={3} size="md" className="font-bold">
                      {provider.name.charAt(0)}
                    </Heading>
                  </div>
                  <Heading level={3} size="md">{provider.name}</Heading>
                </div>
                <Text variant="helper">{provider.models}</Text>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="mt-16" data-testid="features-security-section">
        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Heading level={2} size="xl">
                  {t('pages.features.security.heading')}
                </Heading>
                <Text variant="helper">{t('pages.features.security.body')}</Text>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {securityFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <Text variant="small">{feature}</Text>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <div className="mt-12 text-center">
        <a
          href="/about"
          data-testid="about-cta-link"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          {t('pages.about.title')}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
