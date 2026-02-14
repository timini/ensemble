/** Security & Privacy section — checklist with shield icon. */

import { Shield } from 'lucide-react';
import { Heading } from '@/components/atoms/Heading';
import { Text } from '@/components/atoms/Text';
import { Card, CardHeader, CardContent } from '@/components/atoms/Card';

interface Props {
  heading: string;
  body: string;
  features: string[];
}

export function SecuritySection({ heading, body, features }: Props) {
  return (
    <section className="mt-16" data-testid="features-security-section">
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Shield className="h-5 w-5 text-success" />
            </div>
            <div>
              <Heading level={2} size="xl">{heading}</Heading>
              <Text variant="helper">{body}</Text>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10">
                  <div className="h-2 w-2 rounded-full bg-success" />
                </div>
                <Text variant="small">{feature}</Text>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
