import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';

export interface HowItWorksProps {
  /** Anchor id, so the header can link to it. Defaults to `how`. */
  id?: string;
  className?: string;
}

const STEPS = ['ask', 'compare', 'read'] as const;

/**
 * HowItWorks molecule: the three steps of a run (ask once, compare side by
 * side, read the agreement), numbered.
 *
 * @example
 * ```tsx
 * <HowItWorks />
 * ```
 */
export function HowItWorks({ id = 'how', className }: HowItWorksProps) {
  const { t } = useTranslation();
  const key = 'molecules.howItWorks';
  return (
    <section id={id} data-testid="how-it-works" className={cn('scroll-mt-20', className)}>
      <h2 className="font-display text-title font-normal">{t(`${key}.heading`)}</h2>
      <ol className="mt-8 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step} data-testid={`how-it-works-${step}`} className="border-t border-border pt-5">
            <span className="font-mono text-caption text-primary">0{i + 1}</span>
            <h3 className="mt-2 text-heading">{t(`${key}.steps.${step}.title`)}</h3>
            <p className="mt-2 text-label text-muted-foreground">{t(`${key}.steps.${step}.body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
