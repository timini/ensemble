import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../../atoms/Card';
import { Heading } from '../../atoms/Heading';

/** A model in the benchmark matrix. */
export interface BenchmarkMethodModel {
  label: string;
  /** Model spec as the eval CLI takes it (`openrouter:qwen/qwen3.5-9b`). */
  spec: string;
}

export interface BenchmarkMethodProps {
  /** Dataset names in run order. */
  datasets: string[];
  /** Questions sampled per dataset. */
  sample: number;
  questionSeed: number;
  optionSeed: number;
  /** Open models, run alone and as the ensemble. */
  models: BenchmarkMethodModel[];
  /** Ensemble methods (`majority`, `standard`, `elo`, `council`). */
  strategies: string[];
  /** Display name of the model that writes the standard consensus. */
  summarizer: string;
  /** Premium reference model. */
  reference: BenchmarkMethodModel;
  /** True when the reference has no published results yet: it is shown as coming soon. */
  referencePending?: boolean;
  /** Link to the full method (packages/eval/docs/BENCHMARKS.md). */
  docsUrl: string;
  className?: string;
}

/**
 * BenchmarkMethod organism: how the benchmark numbers are produced, in
 * plain sentences. Shown with results and in the "not run yet" state, so
 * the method is always visible. A reference with no results yet is shown as
 * coming soon.
 *
 * @example
 * ```tsx
 * <BenchmarkMethod datasets={['GSM8K']} sample={200} questionSeed={42} optionSeed={1729}
 *   models={models} strategies={['majority', 'standard']} summarizer="Qwen3.5 9B"
 *   reference={reference} docsUrl="https://github.com/.../BENCHMARKS.md" />
 * ```
 */
export const BenchmarkMethod = React.forwardRef<HTMLDivElement, BenchmarkMethodProps>(
  (
    { datasets, sample, questionSeed, optionSeed, models, strategies, summarizer, reference, referencePending = false, docsUrl, className },
    ref,
  ) => {
    const { t } = useTranslation();
    const k = (key: string) => `organisms.benchmarkMethod.${key}`;
    const named = (m: BenchmarkMethodModel) => `${m.label} (${m.spec})`;
    const items: Array<[string, string]> = [
      ['datasets', t(k('datasets'), { list: datasets.join(', '), sample, questionSeed })],
      ['scoring', t(k('scoring'), { optionSeed })],
      ['models', t(k('models'), { list: models.map(named).join(', ') })],
      ['ensemble', t(k('ensemble'), { list: strategies.map((s) => t(k(`strategy.${s}`), { summarizer })).join(', ') })],
      ['reference', t(k(referencePending ? 'referencePending' : 'reference'), { model: named(reference) })],
      ['statistics', t(k('statistics'))],
      ['cost', t(k('cost'))],
    ];

    return (
      <Card ref={ref} data-testid="benchmark-method" className={className}>
        <CardContent className="space-y-4 p-6">
          <Heading level={2} size="xl">{t(k('title'))}</Heading>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            {items.map(([id, text]) => (
              <li key={id} data-testid={`benchmark-method-${id}`}>{text}</li>
            ))}
          </ul>
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="benchmark-method-docs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
          >
            {t(k('docsLink'))}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </CardContent>
      </Card>
    );
  },
);

BenchmarkMethod.displayName = 'BenchmarkMethod';
