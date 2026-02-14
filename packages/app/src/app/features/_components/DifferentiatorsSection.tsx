/** Differentiators section — 3 unique feature cards. */

import { TrendingUp, GitBranch, UserPlus } from 'lucide-react';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';
import { Card, CardContent } from '@/components/atoms/Card';

export interface Differentiator {
  title: string;
  body: string;
  metrics: string[];
}

const ICONS = [TrendingUp, GitBranch, UserPlus];
const COLORS = [
  'bg-success/10 text-success',
  'bg-info/10 text-info',
  'bg-accent/10 text-accent-foreground',
];

interface Props {
  heading: string;
  items: Differentiator[];
}

export function DifferentiatorsSection({ heading, items }: Props) {
  return (
    <section className="mt-16" data-testid="features-differentiators-section">
      <Heading level={2} size="2xl" className="text-center mb-8">
        {heading}
      </Heading>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item, i) => {
          const Icon = ICONS[i] ?? TrendingUp;
          return (
            <Card key={i} className="border-2 hover:border-primary/50 transition-all">
              <CardContent className="pt-6">
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${COLORS[i]}`}>
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
  );
}
