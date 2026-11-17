import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Copy, RotateCcw, Share2 } from 'lucide-react';
import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus';
import { Markdown } from '../../atoms/Markdown';
import { MajorityVoteBreakdown, type MajorityVoteBreakdownProps } from '../MajorityVoteBreakdown';
import { RunCostSummary, type RunCostSummaryProps } from '../RunCostSummary';
import { cn } from '../../../lib/utils';

export type ConsensusAnswerStatus = 'awaiting' | 'generating' | 'success' | 'failed' | 'unavailable';

export interface ConsensusAnswerProps {
  status: ConsensusAnswerStatus;
  /** Markdown consensus text. */
  text?: string;
  method: ConsensusMethod;
  /** Model that merged the answers. */
  summarizerName?: string;
  /** Mechanical vote, for the majority method. */
  majorityVote?: MajorityVoteBreakdownProps;
  /** Calls and cost of the run, shown on one line in the footer. */
  cost?: RunCostSummaryProps;
  /** Wall time of the whole run. */
  durationMs?: number;
  /** Provider message when the consensus failed. */
  error?: string;
  onRetry?: () => void;
  onCopy?: () => void;
  /** Shows a share button when set. */
  onShare?: () => void;
  className?: string;
}

const action =
  'focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-label transition-colors duration-fast hover:bg-muted';

/**
 * ConsensusAnswer molecule: the merged answer, how it was made (method and
 * summarizer), the majority vote when there was one, and what the run cost.
 * Covers waiting, writing, failed and not available states.
 *
 * @example
 * ```tsx
 * <ConsensusAnswer status="success" text={text} method="standard"
 *   summarizerName="Claude Opus 5.5" cost={cost} durationMs={6200} />
 * ```
 */
export function ConsensusAnswer(props: ConsensusAnswerProps) {
  const { status, text = '', method, summarizerName } = props;
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  const headingId = React.useId();
  const key = 'molecules.consensusAnswer';
  const methodName = t(`molecules.methodMenu.methods.${method}.name`);

  const copy = async () => {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    props.onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={status === 'generating' ? 'true' : undefined}
      data-testid="consensus-answer"
      data-status={status}
      className={cn('flex flex-col rounded-2xl border border-primary/25 bg-card shadow-sm', props.className)}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pt-5">
        <h2 id={headingId} className="text-caption font-medium uppercase tracking-wider text-primary">
          {t(`${key}.heading`)}
        </h2>
        <p data-testid="consensus-answer-by" className="text-caption text-muted-foreground">
          {summarizerName ? t(`${key}.mergedBy`, { method: methodName, model: summarizerName }) : methodName}
        </p>
      </header>

      <div className="flex-1 px-5 py-4">
        {status === 'success' && (
          <div className="space-y-4">
            <Markdown className="text-body text-foreground">{text}</Markdown>
            {props.majorityVote && <MajorityVoteBreakdown {...props.majorityVote} />}
          </div>
        )}
        {status === 'generating' && (
          <div data-testid="consensus-answer-state">
            <p className="mb-3 inline-flex items-center gap-1.5 text-caption text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
              {t(`${key}.generating`)}
            </p>
            <div className="space-y-2.5" aria-hidden="true">
              {['w-full', 'w-11/12', 'w-full', 'w-3/5'].map((w, i) => (
                <div key={i} className={cn('h-3.5 animate-pulse rounded bg-muted', w)} />
              ))}
            </div>
          </div>
        )}
        {(status === 'awaiting' || status === 'unavailable') && (
          <p data-testid="consensus-answer-state" className="text-label text-muted-foreground">
            {t(`${key}.${status}`)}
          </p>
        )}
        {status === 'failed' && (
          <div data-testid="consensus-answer-state" className="space-y-3">
            <p className="flex items-start gap-2 text-label text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t(`${key}.failed`)}
            </p>
            {props.error && <p className="break-words text-caption text-muted-foreground">{props.error}</p>}
            {props.onRetry && (
              <button type="button" onClick={props.onRetry} className={cn(action, 'border border-border')}>
                <RotateCcw className="size-4" aria-hidden="true" />
                {t(`${key}.retry`)}
              </button>
            )}
          </div>
        )}
      </div>

      {(props.cost || status === 'success') && (
        <footer data-testid="consensus-answer-footer" className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-1 text-caption tabular-nums text-muted-foreground">
            {props.cost && <RunCostSummary {...props.cost} compact />}
            {props.durationMs !== undefined && <span>{props.cost ? '· ' : ''}{t('molecules.answerCard.seconds', { value: (props.durationMs / 1000).toFixed(1) })}</span>}
          </div>
          {status === 'success' && (
            <div className="flex gap-1">
              <button type="button" onClick={copy} data-testid="consensus-answer-copy" className={action}>
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {copied ? t(`${key}.copied`) : t(`${key}.copy`)}
              </button>
              {props.onShare && (
                <button type="button" onClick={props.onShare} data-testid="consensus-answer-share" className={action}>
                  <Share2 className="size-4" aria-hidden="true" />
                  {t(`${key}.share`)}
                </button>
              )}
            </div>
          )}
        </footer>
      )}
    </section>
  );
}
