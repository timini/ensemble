import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';

export interface ScoreGuideProps {
  /** Link to the benchmarks page, where the method and results are. */
  benchmarksHref: string;
  className?: string;
}

const LEVELS = ['high', 'medium', 'low'] as const;
const DOT: Record<(typeof LEVELS)[number], string> = { high: 'bg-success', medium: 'bg-warning', low: 'bg-destructive' };

/**
 * ScoreGuide molecule: what the agreement score tells a reader, level by
 * level. It makes no accuracy promise (see the product vision's claims
 * rule) and links to the benchmarks for how the method is tested.
 *
 * @example
 * ```tsx
 * <ScoreGuide benchmarksHref="/benchmarks" />
 * ```
 */
export function ScoreGuide({ benchmarksHref, className }: ScoreGuideProps) {
  const { t } = useTranslation();
  const key = 'molecules.scoreGuide';
  return (
    <section data-testid="score-guide" className={cn('grid gap-10 md:grid-cols-[1fr_1.4fr]', className)}>
      <div>
        <h2 className="font-display text-title font-normal">{t(`${key}.heading`)}</h2>
        <p className="mt-3 text-label text-muted-foreground">{t(`${key}.body`)}</p>
        <a
          href={benchmarksHref}
          data-testid="score-guide-benchmarks"
          className="focus-ring mt-4 inline-block rounded text-label font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          {t(`${key}.benchmarks`)}
        </a>
      </div>
      <ul className="divide-y divide-border">
        {LEVELS.map((level) => (
          <li key={level} data-testid={`score-guide-${level}`} className="flex gap-4 py-4 first:pt-0">
            <span aria-hidden="true" className={cn('mt-2 inline-block size-2 shrink-0 rounded-full', DOT[level])} />
            <div>
              <p className="text-label font-semibold">{t(`molecules.agreementSummary.levels.${level}.label`)}</p>
              <p className="text-label text-muted-foreground">{t(`${key}.levels.${level}`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
