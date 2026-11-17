import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Vote } from 'lucide-react';
import { Icon } from '../../atoms/Icon';
import { Text } from '../../atoms/Text';
import { cn } from '../../../lib/utils';

/** Votes for one normalised short answer. */
export interface MajorityVoteOption {
  /** The answer as the first model that gave it wrote it. */
  answer: string;
  votes: number;
  /** Display names of the models that gave this answer. */
  models: string[];
}

/**
 * - `winner`: one answer has the most votes and is the consensus.
 * - `tie`: answers share the most votes; the LLM method made the consensus.
 * - `no-short-answers`: the answers are long-form; the LLM method was used.
 * - `extraction-failed`: no short answers could be extracted; the LLM method was used.
 */
export type MajorityVoteOutcome = 'winner' | 'tie' | 'no-short-answers' | 'extraction-failed';

export interface MajorityVoteBreakdownProps {
  outcome: MajorityVoteOutcome;
  /** Answers with their votes, most votes first. */
  options: MajorityVoteOption[];
  /** Number of answers put to the vote, abstentions included. */
  totalResponses: number;
  /** Display names of models whose answer had no short final answer. */
  abstainedModels?: string[];
  className?: string;
}

/**
 * MajorityVoteBreakdown molecule shows the mechanical majority vote: each
 * short answer with its vote count and the models that gave it, the winner or
 * the tie, and why the LLM majority method was used when the vote could not
 * decide.
 *
 * @example
 * ```tsx
 * <MajorityVoteBreakdown outcome="winner" totalResponses={3}
 *   options={[{ answer: '42', votes: 2, models: ['GPT', 'Claude'] }, { answer: '41', votes: 1, models: ['Gemini'] }]} />
 * ```
 */
export const MajorityVoteBreakdown = React.forwardRef<HTMLDivElement, MajorityVoteBreakdownProps>(
  ({ outcome, options, totalResponses, abstainedModels = [], className }, ref) => {
    const { t } = useTranslation();
    const list = (items: string[]) =>
      items.length < 2
        ? items.join('')
        : `${items.slice(0, -1).join(', ')} ${t('molecules.majorityVoteBreakdown.and')} ${items[items.length - 1]}`;
    const top = options[0];
    const tied = top ? options.filter((option) => option.votes === top.votes) : [];
    const showTally = (outcome === 'winner' || outcome === 'tie') && options.length > 0;

    const summary =
      outcome === 'winner' && top
        ? t('molecules.majorityVoteBreakdown.winner', {
            answer: top.answer,
            votes: top.votes,
            total: totalResponses,
          })
        : outcome === 'tie'
          ? t('molecules.majorityVoteBreakdown.tie', {
              answers: list(tied.map((option) => option.answer)),
              votes: top?.votes ?? 0,
            })
          : outcome === 'extraction-failed'
            ? t('molecules.majorityVoteBreakdown.extractionFailed')
            : t('molecules.majorityVoteBreakdown.noShortAnswers');

    return (
      <div
        ref={ref}
        data-testid="majority-vote-breakdown"
        data-outcome={outcome}
        className={cn('flex gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3', className)}
      >
        <Icon className="mt-0.5 text-muted-foreground">
          <Vote />
        </Icon>
        <div className="min-w-0 flex-1 space-y-2">
          <Text as="p" className="font-medium text-foreground" data-testid="majority-vote-title">
            {t('molecules.majorityVoteBreakdown.title')}
          </Text>
          <Text as="p" className="text-sm text-muted-foreground" data-testid="majority-vote-summary">
            {summary}
          </Text>
          {showTally && (
            <ul className="space-y-2" data-testid="majority-vote-options">
              {options.map((option) => {
                const isWinner = outcome === 'winner' && option === top;
                const share = totalResponses > 0 ? (option.votes / totalResponses) * 100 : 0;
                return (
                  <li
                    key={`${option.answer}-${option.models.join(',')}`}
                    data-testid="majority-vote-option"
                    data-winner={String(isWinner)}
                    className="space-y-1"
                  >
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span
                        data-testid="majority-vote-answer"
                        className={cn('break-words font-mono', isWinner ? 'font-semibold text-foreground' : 'text-foreground')}
                      >
                        {option.answer}
                      </span>
                      <span data-testid="majority-vote-count" className="shrink-0 text-muted-foreground">
                        {t('molecules.majorityVoteBreakdown.votes', { count: option.votes })}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted" aria-hidden="true">
                      <div
                        className={cn('h-1.5 rounded-full', isWinner ? 'bg-primary' : 'bg-muted-foreground/50')}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <Text as="p" className="text-xs text-muted-foreground" data-testid="majority-vote-models">
                      {option.models.join(', ')}
                    </Text>
                  </li>
                );
              })}
            </ul>
          )}
          {abstainedModels.length > 0 && (
            <Text as="p" className="text-xs text-muted-foreground" data-testid="majority-vote-abstained">
              {t('molecules.majorityVoteBreakdown.abstained', { models: abstainedModels.join(', ') })}
            </Text>
          )}
        </div>
      </div>
    );
  },
);

MajorityVoteBreakdown.displayName = 'MajorityVoteBreakdown';
