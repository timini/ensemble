import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { AgreementRing, type AgreementLevel } from '../../atoms/AgreementRing';
import { Badge } from '../../atoms/Badge';
import { Markdown } from '../../atoms/Markdown';
import { ModelLogo, type ModelLogoProvider } from '../../atoms/ModelLogo';
import { cn } from '../../../lib/utils';

/** One model's answer in the example. */
export interface ExampleRunAnswer {
  id: string;
  /** Display name of the model. */
  name: string;
  provider: ModelLogoProvider;
  modelId?: string;
  /** The answer, as Markdown. */
  text: string;
  /** Time to the full answer, in seconds. */
  seconds?: number;
}

export interface ExampleRunProps {
  /** The question that was asked. */
  prompt: string;
  answers: ExampleRunAnswer[];
  /** The consensus answer, as Markdown. */
  consensus: string;
  /** Overall agreement, 0 to 1. */
  score: number;
  level: AgreementLevel;
  /** Whether the level cut-offs are calibrated for the embedding model. Defaults to false. */
  calibrated?: boolean;
  /** Model calls in the run, embeddings and consensus included. */
  calls: number;
  /** Formatted total cost, such as `$0.0003`. */
  cost?: string;
  /** Formatted date the run was recorded. */
  recordedOn: string;
  /** Where the models were called, such as OpenRouter. */
  via: string;
  /** Embedding model behind the agreement score. */
  embeddingModel: string;
  /** Model that wrote the consensus. */
  summarizer: string;
  /** Not a real run: labelled as an illustrative example. */
  illustrative?: boolean;
  className?: string;
}

const TONE: Record<AgreementLevel, string> = { high: 'text-success', medium: 'text-warning', low: 'text-destructive' };
const label = 'text-caption font-medium uppercase tracking-wider text-muted-foreground';

/**
 * ExampleRun organism: a recorded run shown on the landing page, so a
 * visitor sees a real result before adding a key. The question, the
 * agreement score and its meaning, the consensus, and each answer (clamped
 * until expanded), with a line that says where and when it was recorded.
 *
 * @example
 * ```tsx
 * <ExampleRun prompt="..." answers={answers} consensus="..." score={0.97} level="high"
 *   calls={7} cost="$0.0003" recordedOn="17 November 2026" via="OpenRouter"
 *   embeddingModel="openai/text-embedding-3-small" summarizer="Gemini 2.5 Flash Lite" />
 * ```
 */
export function ExampleRun(props: ExampleRunProps) {
  const { answers, score, level, illustrative = false, calibrated = false } = props;
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState(false);
  const key = 'organisms.exampleRun';
  const listId = React.useId();

  return (
    <figure
      data-testid="example-run"
      className={cn('overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-md', props.className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-5 py-3">
        <span className="flex items-center gap-2">
          <span className={label}>{t(`${key}.heading`)}</span>
          <span
            data-testid="example-run-kind"
            className={cn(
              'rounded-full px-2 text-caption',
              illustrative ? 'border border-dashed border-warning text-warning' : 'bg-success/10 text-success',
            )}
          >
            {t(illustrative ? `${key}.illustrative` : `${key}.real`)}
          </span>
        </span>
        <span data-testid="example-run-stats" className="text-caption tabular-nums text-muted-foreground">
          {[
            t(`${key}.models`, { count: answers.length }),
            t(`${key}.calls`, { count: props.calls }),
            props.cost,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>

      <div id={listId} className="space-y-5 p-5">
        <p data-testid="example-run-prompt" className="text-body font-medium leading-snug">
          {props.prompt}
        </p>

        <div className="flex items-center gap-4 rounded-xl bg-muted/70 p-4">
          <AgreementRing score={score} level={level} size={64} />
          <div className="min-w-0 space-y-0.5">
            <p data-testid="example-run-level" className={cn('text-label font-semibold', TONE[level])}>
              {t(`molecules.agreementSummary.levels.${level}.label`)}
            </p>
            <p className="text-caption text-muted-foreground">{t(`molecules.agreementSummary.levels.${level}.meaning`)}</p>
            {!calibrated && (
              <div data-testid="example-run-uncalibrated" className="flex flex-wrap items-center gap-1.5 pt-1 text-caption text-muted-foreground">
                <Badge variant="outline">{t('molecules.agreementSummary.uncalibrated')}</Badge>
                {t(`${key}.uncalibratedHint`)}
              </div>
            )}
          </div>
        </div>

        <div>
          <p className={cn(label, 'mb-1.5')}>{t(`${key}.consensus`)}</p>
          <Markdown data-testid="example-run-consensus" className={cn('text-label leading-relaxed', !expanded && 'line-clamp-4')}>
            {props.consensus}
          </Markdown>
        </div>

        <div>
          <p className={cn(label, 'mb-2')}>{t(`${key}.answers`)}</p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {answers.map((answer) => (
              <li
                key={answer.id}
                data-testid="example-run-answer"
                data-model={answer.name}
                className="min-w-0 px-3 py-2.5"
              >
                <div className="mb-1 flex items-center gap-2">
                  <ModelLogo provider={answer.provider} modelId={answer.modelId} modelName={answer.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-caption font-medium">{answer.name}</span>
                  {answer.seconds !== undefined && (
                    <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                      {t(`${key}.seconds`, { value: answer.seconds })}
                    </span>
                  )}
                </div>
                <Markdown
                  data-testid="example-run-answer-text"
                  className={cn('text-caption text-muted-foreground', !expanded && 'line-clamp-2')}
                >
                  {answer.text}
                </Markdown>
              </li>
            ))}
          </ul>
          <button
            type="button"
            data-testid="example-run-toggle"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((v) => !v)}
            className="focus-ring mt-2 inline-flex items-center gap-1 rounded text-caption font-medium text-primary"
          >
            {t(expanded ? `${key}.showLess` : `${key}.showAll`)}
            <ChevronDown className={cn('size-3.5 transition-transform duration-fast', expanded && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
      </div>

      <figcaption data-testid="example-run-source" className="border-t border-border px-5 py-3 text-caption text-muted-foreground">
        {t(illustrative ? `${key}.sourceIllustrative` : `${key}.source`, {
          date: props.recordedOn,
          via: props.via,
          embedding: props.embeddingModel,
          summarizer: props.summarizer,
        })}
      </figcaption>
    </figure>
  );
}
