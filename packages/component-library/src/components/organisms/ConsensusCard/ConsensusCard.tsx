import * as React from 'react';
import { Card, CardContent } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { Heading } from '../../atoms/Heading';
import { Share } from 'lucide-react';

export interface ConsensusCardProps {
  /** The consensus response text */
  consensusText: string;
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
  ({ consensusText, summarizerModel, onShare, heading = 'Consensus' }, ref) => {
    return (
      <Card ref={ref} className="bg-blue-50 border-blue-200" data-testid="consensus-card">
        <CardContent className="p-6">
          <Heading level={3} size="lg" className="mb-2 text-blue-900">
            {heading}
          </Heading>
          <p className="text-sm text-blue-700 mb-4">
            Combined summary provided by {summarizerModel}.
          </p>

          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-gray-900 leading-relaxed">{consensusText}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Share className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">Share this consensus response</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-white"
              onClick={onShare}
              data-testid="share-button"
            >
              Share
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

ConsensusCard.displayName = 'ConsensusCard';
