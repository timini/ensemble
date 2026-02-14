/** Model Ecosystem section — 4 provider cards with model names. */

import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import { Card, CardContent } from '@/components/atoms/Card';

export interface ProviderModel {
  name: string;
  models: string;
}

const COLORS = [
  'bg-success/10 text-success',
  'bg-warning/10 text-warning',
  'bg-info/10 text-info',
  'bg-accent/10 text-accent-foreground',
];

interface Props {
  heading: string;
  body: string;
  providers: ProviderModel[];
}

export function ModelsSection({ heading, body, providers }: Props) {
  return (
    <section className="mt-16" data-testid="features-models-section">
      <Heading level={2} size="2xl" className="text-center mb-2">
        {heading}
      </Heading>
      <Text className="text-center mb-8" color="muted">
        {body}
      </Text>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {providers.map((provider, i) => (
          <Card key={i}>
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${COLORS[i]}`}>
                  <span className="text-base font-bold" aria-hidden="true">
                    {provider.name.charAt(0)}
                  </span>
                </div>
                <Heading level={3} size="md">{provider.name}</Heading>
              </div>
              <Text variant="helper">{provider.models}</Text>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
