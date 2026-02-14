/** Operating Modes section — Free vs Pro with feature checklists. */

import { Key, CreditCard, Check } from 'lucide-react';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';
import { Card, CardHeader, CardContent } from '@/components/atoms/Card';

export interface ModeInfo {
  heading: string;
  badge: string;
  body: string;
  features: string[];
}

interface Props {
  heading: string;
  freeMode: ModeInfo;
  proMode: ModeInfo;
}

export function ModesSection({ heading, freeMode, proMode }: Props) {
  const modes = [
    { mode: freeMode, icon: Key, border: 'border-primary/30', badgeVariant: 'outline' as const },
    { mode: proMode, icon: CreditCard, border: '', badgeVariant: 'default' as const },
  ];

  return (
    <section className="mt-16" data-testid="features-modes-section">
      <Heading level={2} size="2xl" className="text-center mb-8">
        {heading}
      </Heading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modes.map(({ mode, icon: ModeIcon, border, badgeVariant }, i) => (
          <Card key={i} className={border}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ModeIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Heading level={3} size="lg">{mode.heading}</Heading>
                  <Badge variant={badgeVariant} className="mt-1">
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
                    <Check className="h-4 w-4 text-success shrink-0" />
                    <Text variant="small">{f}</Text>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
