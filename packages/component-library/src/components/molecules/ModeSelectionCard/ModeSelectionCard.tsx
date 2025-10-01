import * as React from 'react';
import { Card, CardContent } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { cn } from '@/lib/utils';

export type Mode = 'free' | 'pro';

export interface ModeSelectionCardProps {
  /** The mode type (free or pro) */
  mode: Mode;
  /** Whether the mode is currently selected */
  selected?: boolean;
  /** Whether the mode is disabled */
  disabled?: boolean;
  /** Callback when mode is clicked */
  onClick?: () => void;
}

const MODE_CONFIG = {
  free: {
    title: 'Free Mode',
    description: 'Bring your own API keys. Completely secure, your keys are encrypted and never leave your browser.',
    icon: '🔧',
    buttonText: 'Start in Free Mode',
  },
  pro: {
    title: 'Pro Mode',
    description: 'Buy credits to get access to the latest models across all providers.',
    icon: '⭐',
    buttonText: 'Go Pro',
  },
} as const;

/**
 * ModeSelectionCard molecule for selecting application mode.
 *
 * Displays a mode option with icon, title, description, and action button.
 * Matches the wireframe design from config page.
 *
 * @example
 * ```tsx
 * <ModeSelectionCard
 *   mode="free"
 *   selected={true}
 *   onClick={() => setMode('free')}
 * />
 * ```
 */
export const ModeSelectionCard = React.forwardRef<HTMLDivElement, ModeSelectionCardProps>(
  ({ mode, selected = false, disabled = false, onClick }, ref) => {
    const config = MODE_CONFIG[mode];

    return (
      <Card
        ref={ref}
        data-mode={mode}
        data-selected={selected}
        data-disabled={disabled}
        className={cn(
          'border-2 hover:border-blue-200 transition-colors',
          selected && 'border-blue-500 bg-blue-50'
        )}
      >
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-lg">{config.icon}</span>
            </div>
            <h4 className="text-xl font-semibold">{config.title}</h4>
          </div>
          <p className="text-gray-600 mb-6">{config.description}</p>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={onClick}
            disabled={disabled}
          >
            {config.buttonText}
          </Button>
        </CardContent>
      </Card>
    );
  }
);

ModeSelectionCard.displayName = 'ModeSelectionCard';
