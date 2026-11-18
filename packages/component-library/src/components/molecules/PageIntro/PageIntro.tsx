import * as React from 'react';
import { cn } from '../../../lib/utils';

export interface PageIntroProps {
  /** Short line above the title. */
  eyebrow?: string;
  /** The page's h1. */
  title: string;
  /** One or two sentences under the title. */
  lead?: string;
  /** Actions under the lead, such as links styled as buttons. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * PageIntro molecule: the top of a public page (features, about), in the
 * landing page's style: eyebrow, display title, lead and actions.
 *
 * @example
 * ```tsx
 * <PageIntro eyebrow="About" title="Why Ensemble exists" lead="..." />
 * ```
 */
export function PageIntro({ eyebrow, title, lead, children, className }: PageIntroProps) {
  return (
    <header data-testid="page-intro" className={cn('max-w-3xl space-y-5', className)}>
      {eyebrow && <p className="text-caption font-medium uppercase tracking-wider text-primary">{eyebrow}</p>}
      <h1 className="text-balance font-display text-display">{title}</h1>
      {lead && <p data-testid="page-intro-lead" className="text-lead text-muted-foreground">{lead}</p>}
      {children && <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">{children}</div>}
    </header>
  );
}
