import * as React from 'react';
import { cn } from '../../../lib/utils';

export interface FeatureGridItem {
  /** Stable id, also used in the item's test id. */
  id: string;
  title: string;
  body: string;
}

export interface FeatureGridProps {
  /** Section heading (h2). */
  heading: string;
  /** Optional line under the heading. */
  intro?: string;
  items: FeatureGridItem[];
  /** Columns from 768 px. Defaults to 3. */
  columns?: 2 | 3;
  /** Prefix for test ids. Defaults to `feature-grid`. */
  testId?: string;
  /** Extra content after the items, such as a link. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * FeatureGrid molecule: a titled section of short items (title and one or
 * two sentences each), separated by hairlines, as on the landing page's
 * "How it works".
 *
 * @example
 * ```tsx
 * <FeatureGrid heading="Ask and compare" items={[{ id: 'side', title: 'Answers side by side', body: '...' }]} />
 * ```
 */
export function FeatureGrid({ heading, intro, items, columns = 3, testId = 'feature-grid', children, className }: FeatureGridProps) {
  return (
    <section data-testid={testId} className={className}>
      <h2 className="font-display text-title font-normal">{heading}</h2>
      {intro && <p className="mt-3 max-w-2xl text-label text-muted-foreground">{intro}</p>}
      <ul className={cn('mt-8 grid gap-x-6 gap-y-8', columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
        {items.map((item) => (
          <li key={item.id} data-testid={`${testId}-item`} data-id={item.id} className="border-t border-border pt-5">
            <h3 className="text-heading">{item.title}</h3>
            <p className="mt-2 text-label text-muted-foreground">{item.body}</p>
          </li>
        ))}
      </ul>
      {children && <div className="mt-8">{children}</div>}
    </section>
  );
}
