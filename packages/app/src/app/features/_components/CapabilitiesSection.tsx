/** Capabilities section — 4 stats with icons. */

import { Layers, Zap, Shield, Unlock } from 'lucide-react';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import { Card, CardContent } from '@/components/atoms/Card';

export interface Capability {
  number: string;
  label: string;
  description: string;
}

const ICONS = [Layers, Zap, Shield, Unlock];

interface Props {
  heading: string;
  items: Capability[];
}

export function CapabilitiesSection({ heading, items }: Props) {
  return (
    <section className="mt-16" data-testid="features-capabilities-section">
      <Card className="bg-muted/30">
        <CardContent className="pt-8 pb-8">
          <Heading level={2} size="2xl" className="text-center mb-8">
            {heading}
          </Heading>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {items.map((cap, i) => {
              const Icon = ICONS[i] ?? Layers;
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
  );
}
