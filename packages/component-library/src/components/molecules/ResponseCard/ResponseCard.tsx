import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardContent } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { ProviderLogo } from '../../atoms/ProviderLogo';
import { LoadingSpinner } from '../../atoms/LoadingSpinner';
import { InlineAlert } from '../../atoms/InlineAlert';
import { Rating } from '../../atoms/Rating';
import { Button } from '../../atoms/Button';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { Markdown } from '../../atoms/Markdown';

export type Provider = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek' | 'perplexity';
export type ResponseStatus = 'streaming' | 'complete' | 'error';
export type ResponseType = 'ai' | 'manual';

export interface ResponseCardProps {
  /** Model name (required for AI responses) */
  modelName?: string;
  /** AI provider (required for AI responses) */
  provider?: Provider;
  /** Current status of the response */
  status: ResponseStatus;
  /** Type of response */
  responseType: ResponseType;
  /** Response content */
  content?: string;
  /** Error message (when status is 'error') */
  error?: string;
  /** Star rating value (0-5) */
  rating?: number;
  /** Response time (e.g., "1568ms") */
  responseTime?: string;
  /** Token count (e.g., 150) */
  tokenCount?: number;
  /** Callback when rating changes */
  onRatingChange?: (rating: number) => void;
  /** Callback when retry is clicked (only for error state) */
  onRetry?: () => void;
  /** Callback when copy is clicked */
  onCopy?: () => void;
  /** Initial expanded state (default: true) */
  defaultExpanded?: boolean;
  /** Optional test id for querying */
  testId?: string;
}

export const PROVIDER_NAMES = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'XAI',
  deepseek: 'DeepSeek',
  perplexity: 'Perplexity',
} as const;

/**
 * ResponseCard molecule for displaying AI or manual responses.
 *
 * Combines Card, Badge, LoadingSpinner, and InlineAlert atoms to create
 * a complete response display with streaming support and error handling.
 *
 * @example
 * ```tsx
 * <ResponseCard
 *   modelName="GPT-4"
 *   provider="openai"
 *   status="complete"
 *   responseType="ai"
 *   content="This is the AI response"
 * />
 * ```
 */
export const ResponseCard = React.forwardRef<HTMLDivElement, ResponseCardProps>(
  (
    {
      modelName,
      provider,
      status,
      responseType,
      content,
      error,
      rating = 0,
      responseTime,
      tokenCount,
      onRatingChange,
      onRetry,
      onCopy,
      defaultExpanded = true,
      testId,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
    const isStreaming = status === 'streaming';
    const isError = status === 'error';
    const isManual = responseType === 'manual';
    const isComplete = status === 'complete';

    const handleCopy = () => {
      if (content) {
        navigator.clipboard.writeText(content);
      }
      onCopy?.();
    };

    console.log(`[ResponseCard] Render ${modelName} (${testId}), status=${status}, tokenCount=${tokenCount}`);

    return (
      <Card
        ref={ref}
        role="article"
        data-status={status}
        data-response-type={responseType}
        data-expanded={isExpanded}
        aria-busy={isStreaming ? 'true' : undefined}
        className={cn(
          'w-full',
          isError && 'border-destructive'
        )}
        data-testid={testId}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {isManual ? (
                <div className="flex flex-col items-start">
                  <Badge variant="secondary">{t('molecules.responseCard.manual')}</Badge>
                  {modelName && (
                    <span className="mt-1 font-semibold text-base text-foreground">
                      {modelName}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  {provider && (
                    <Badge variant="outline" className="gap-1.5">
                      <ProviderLogo provider={provider} size="sm" />
                      {PROVIDER_NAMES[provider]}
                    </Badge>
                  )}
                  {modelName && <span className="font-semibold text-base">{modelName}</span>}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isStreaming && (
                <>
                  <LoadingSpinner size="sm" data-testid="loading-spinner" />
                  <Badge variant="default">{t('molecules.responseCard.streaming')}</Badge>
                </>
              )}
              {isComplete && !isError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="gap-1"
                  data-testid="expand-button"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      <span className="text-sm">{t('molecules.responseCard.collapse')}</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      <span className="text-sm">{t('molecules.responseCard.expand')}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {isError ? (
            <div className="flex flex-col gap-2">
              <InlineAlert variant="error">
                {error}
              </InlineAlert>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="self-start"
                >
                  {t('common.retry', 'Retry')}
                </Button>
              )}
            </div>
          ) : (
            <>
              {isExpanded && (
                <Markdown className="text-sm text-foreground">
                  {content || ''}
                </Markdown>
              )}

              {isComplete && !isError && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1"
                    data-testid="copy-button"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-sm">{t('molecules.responseCard.copy')}</span>
                  </Button>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t('molecules.responseCard.rateResponse')}</span>
                      <Rating
                        value={rating}
                        size="sm"
                        onChange={onRatingChange}
                        data-testid="rating"
                      />
                    </div>
                    {responseTime && (
                      <span className="text-sm text-muted-foreground">
                        {t('molecules.responseCard.responseTime', { time: responseTime })}
                      </span>
                    )}
                    {tokenCount !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        {tokenCount} tokens
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }
);

ResponseCard.displayName = 'ResponseCard';
