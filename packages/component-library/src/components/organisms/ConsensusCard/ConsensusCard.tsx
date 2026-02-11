import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Heading } from '../../atoms/Heading';
import { Badge } from '../../atoms/Badge';
import { Markdown } from '../../atoms/Markdown';
import { Share, Copy, Check } from 'lucide-react';

export interface ConsensusCardProps {
  /** The consensus text to display */
  consensusText?: string;
  /** Whether consensus is currently being generated */
  isLoading?: boolean;
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
 * with sharing functionality. Matches the wireframe design from review page.
 *
 * @example
 * ```tsx
 * <ConsensusCard
 *   consensusText="Your question has a clear focus..."
 *   summarizerModel="Claude 3 Opus"
 *   onShare={() => console.log('Share clicked')}
 * />
 * ```
 */
export const ConsensusCard = React.forwardRef<HTMLDivElement, ConsensusCardProps>(
  ({ consensusText, summarizerModel, onShare, heading, isLoading = false }, ref) => {
    const { t } = useTranslation();
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
      if (consensusText) {
        await navigator.clipboard.writeText(consensusText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    if (!consensusText && !isLoading) return null;

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
              {isLoading && (
                <span className="text-sm text-primary animate-pulse">Generating...</span>
              )}
            </div>
            <Badge className="bg-card/80 text-primary border-primary/20">
              {t('organisms.consensusCard.generatedBy', { model: summarizerModel })}
            </Badge>
          </div>

          <div className="prose-blue">
            {isLoading && !consensusText ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-primary/20 rounded w-3/4"></div>
                <div className="h-4 bg-primary/20 rounded w-full"></div>
                <div className="h-4 bg-primary/20 rounded w-5/6"></div>
              </div>
            ) : (
              <Markdown className="text-foreground">
                {consensusText || ''}
              </Markdown>
            )}
          </div>

          {/* Footer with Copy and Share buttons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/20">
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
                  <span className="text-sm">{t('organisms.consensusCard.copied', 'Copied!')}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="text-sm">{t('organisms.consensusCard.copy', 'Copy')}</span>
                </>
              )}
            </Button>

            {onShare && (
              <div className="flex items-center gap-2">
                <Share className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">{t('organisms.consensusCard.shareText')}</span>
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
        </CardContent>
      </Card>
    );
  }
);

ConsensusCard.displayName = 'ConsensusCard';
