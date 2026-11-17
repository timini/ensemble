import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ClipboardPaste, Copy } from 'lucide-react';
import { Markdown } from '../../atoms/Markdown';
import { ModelLogo } from '../../atoms/ModelLogo';
import type { ProviderLogoProvider } from '../../atoms/ProviderLogo';
import { ResponseErrorNotice, type ResponseErrorKind } from '../ResponseErrorNotice';
import { PROVIDER_NAMES } from '../ResponseCard';
import { formatUsd } from '../RunCostSummary/runCostFormat';
import { cn } from '../../../lib/utils';

/** Where one model's answer is: not started, arriving, done or failed. */
export type AnswerStatus = 'waiting' | 'streaming' | 'complete' | 'error';

export interface AnswerCardProps {
  modelName: string;
  provider?: ProviderLogoProvider;
  /** Overrides the provider name, for OpenAI-compatible endpoints (`Ollama`). */
  providerLabel?: string;
  /** `manual` for an answer added by hand. Defaults to `model`. */
  kind?: 'model' | 'manual';
  status: AnswerStatus;
  /** Markdown text, partial while streaming. */
  content?: string;
  durationMs?: number;
  costUsd?: number;
  /** Provider message for an error. */
  error?: string;
  errorKind?: ResponseErrorKind;
  retryAfterSeconds?: number;
  /** Retries this model only. */
  onRetry?: () => void;
  onCopy?: () => void;
  /** DOM id, used by the mobile tabs. */
  id?: string;
  /** Model id or manual answer id, set as `data-answer-id` for the app and tests. */
  answerId?: string;
  /** Defaults to `answer-card`. */
  testId?: string;
  className?: string;
}

/**
 * AnswerCard molecule: one model's answer in the workspace. A header with
 * the model, its provider and what the answer took (time and cost), the
 * answer as Markdown while it streams, the M1 error states with a retry for
 * this model, and a copy action once complete.
 *
 * @example
 * ```tsx
 * <AnswerCard modelName="Claude Opus 5.5" provider="anthropic" status="complete"
 *   content={text} durationMs={4400} costUsd={0.0063} />
 * ```
 */
export function AnswerCard(props: AnswerCardProps) {
  const { modelName, provider, kind = 'model', status, content = '', testId = 'answer-card' } = props;
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  const manual = kind === 'manual';
  const source = manual ? t('molecules.modelChip.manual') : (props.providerLabel ?? (provider ? PROVIDER_NAMES[provider] : ''));
  const meta = [
    props.durationMs !== undefined && t('molecules.answerCard.seconds', { value: (props.durationMs / 1000).toFixed(1) }),
    props.costUsd !== undefined && formatUsd(props.costUsd, i18n.language || 'en'),
  ].filter(Boolean);

  const copy = async () => {
    await navigator.clipboard?.writeText(content);
    setCopied(true);
    props.onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article
      id={props.id}
      aria-label={modelName}
      aria-busy={status === 'streaming' || status === 'waiting' ? 'true' : undefined}
      data-testid={testId}
      data-status={status}
      data-kind={kind}
      data-answer-id={props.answerId}
      className={cn(
        'flex h-full min-w-0 flex-col rounded-2xl border bg-card',
        status === 'error' ? 'border-destructive/40' : 'border-border',
        props.className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {manual || !provider ? <ClipboardPaste className="size-4" aria-hidden="true" /> : <ModelLogo provider={provider} modelName={modelName} size="sm" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-medium">{modelName}</p>
          <p className="truncate text-caption text-muted-foreground">
            {source}
            {status === 'complete' && meta.length > 0 && (
              <span data-testid="answer-card-meta" className="tabular-nums">
                {source ? ' · ' : ''}
                {meta.join(' · ')}
              </span>
            )}
          </p>
        </div>
        {(status === 'streaming' || status === 'waiting') && (
          <span data-testid="answer-card-status" className="inline-flex shrink-0 items-center gap-1.5 text-caption text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            {t(`molecules.answerCard.${status}`)}
          </span>
        )}
      </header>
      <div className="flex-1 px-4 py-4">
        {status === 'error' ? (
          <ResponseErrorNotice kind={props.errorKind} detail={props.error} retryAfterSeconds={props.retryAfterSeconds} onRetry={props.onRetry} />
        ) : status === 'waiting' ? (
          <div data-testid="answer-card-skeleton" className="space-y-2.5" aria-hidden="true">
            {['w-full', 'w-11/12', 'w-4/5'].map((w) => (
              <div key={w} className={cn('h-3 animate-pulse rounded bg-muted', w)} />
            ))}
          </div>
        ) : (
          <Markdown className="text-label leading-relaxed text-foreground">{content}</Markdown>
        )}
      </div>
      {status === 'complete' && content && (
        <footer className="px-2 pb-2">
          <button
            type="button"
            onClick={copy}
            data-testid="answer-card-copy"
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            {copied ? t('molecules.answerCard.copied') : t('molecules.answerCard.copy')}
          </button>
        </footer>
      )}
    </article>
  );
}
