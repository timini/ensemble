import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Heading } from '../../atoms/Heading';
import { Badge } from '../../atoms/Badge';
import { Markdown } from '../../atoms/Markdown';
import { Share, Copy, Check, AlertCircle } from 'lucide-react';

export type ConsensusStatus = 'awaiting' | 'generating' | 'success' | 'failed';

export interface ConsensusCardProps {
  /** The consensus text to display */
  consensusText?: string;
  /** Current status of consensus generation */
  status: ConsensusStatus;
  /** Error message when status is 'failed' */
  error?: string;
  /** Name of the model that generated the consensus */
  summarizerModel: string;
  /** Callback when share button is clicked */
  onShare?: () => void;
  /** Optional heading text (defaults to "Consensus") */
  heading?: string;
}

/**
 * ConsensusCard organism for displaying the consensus summary.
 *
 * Shows the combined summary from the summarizer model in a blue-tinted card
 * with sharing functionality. Supports four status states:
 * awaiting, generating, success, and failed.
 *
 * @example
 * ```tsx
 * <ConsensusCard
 *   status="success"
 *   consensusText="Your question has a clear focus..."
 *   summarizerModel="Claude 3 Opus"
 *   onShare={() => console.log('Share clicked')}
 * />
 * ```
 */
export const ConsensusCard = React.forwardRef<HTMLDivElement, ConsensusCardProps>(
  ({ consensusText, status, error, summarizerModel, onShare, heading }, ref) => {
    const { t } = useTranslation();
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
      if (consensusText) {
        await navigator.clipboard.writeText(consensusText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <Card
        ref={ref}
        className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
        data-testid="consensus-card"
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heading level={3} size="lg" className="text-primary mb-0">
                {heading || t('organisms.consensusCard.heading')}
              </Heading>
              {status === 'generating' && (
                <span className="text-sm text-primary animate-pulse">
                  {t('organisms.consensusCard.generatingText')}
                </span>
              )}
            </div>
            <Badge className="bg-card/80 text-primary border-primary/20">
              {t('organisms.consensusCard.generatedBy', { model: summarizerModel })}
            </Badge>
          </div>

          <div className="prose-blue">
            {status === 'awaiting' && (
              <div className="text-muted-foreground">
                <p className="font-medium">
                  {t('organisms.consensusCard.awaitingText')}
                </p>
                <p className="text-sm mt-1">
                  {t('organisms.consensusCard.awaitingDescription')}
                </p>
              </div>
            )}

            {status === 'generating' && (
              <div className="animate-pulse space-y-2" data-testid="consensus-skeleton">
                <div className="h-4 bg-primary/20 rounded w-3/4"></div>
                <div className="h-4 bg-primary/20 rounded w-full"></div>
                <div className="h-4 bg-primary/20 rounded w-5/6"></div>
              </div>
            )}

            {status === 'success' && (
              <Markdown className="text-foreground">
                {consensusText || ''}
              </Markdown>
            )}

            {status === 'failed' && (
              <div className="text-destructive">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {t('organisms.consensusCard.failedText')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('organisms.consensusCard.failedDescription')}
                    </p>
                  </div>
                </div>
                {error && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                    <p className="text-sm">
                      <span className="font-medium">
                        {t('organisms.consensusCard.errorLabel')}
                      </span>{' '}
                      {error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {status === 'success' && consensusText && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/20" data-testid="consensus-footer">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
                data-testid="copy-button"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="text-sm">
                      {t('organisms.consensusCard.copied', 'Copied!')}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="text-sm">
                      {t('organisms.consensusCard.copy', 'Copy')}
                    </span>
                  </>
                )}
              </Button>

              {onShare && (
                <div className="flex items-center gap-2">
                  <Share className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary">
                    {t('organisms.consensusCard.shareText')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-card"
                    onClick={onShare}
                    data-testid="share-button"
                  >
                    {t('organisms.consensusCard.shareButton')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

ConsensusCard.displayName = 'ConsensusCard';
