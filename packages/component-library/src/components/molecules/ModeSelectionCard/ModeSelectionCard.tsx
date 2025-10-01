import * as React from 'react';
import { Card, CardHeader, CardContent } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { cn } from '@/lib/utils';
import { Zap, Sparkles } from 'lucide-react';

export type Mode = 'free' | 'pro';

export interface ModeSelectionCardProps {
  /** The mode type (free or pro) */
  mode: Mode;
  /** Whether the mode is currently selected */
  selected: boolean;
  /** Whether the mode is disabled */
  disabled?: boolean;
  /** Callback when mode is clicked */
  onClick?: () => void;
}

const MODE_CONFIG = {
  free: {
    title: 'Free Mode',
    description: 'Use a single AI provider with your API key.',
    icon: Zap,
  },
  pro: {
    title: 'Pro Mode',
    description: 'Use multiple AI providers simultaneously for ensemble responses.',
    icon: Sparkles,
  },
} as const;

/**
 * ModeSelectionCard molecule for selecting application mode.
 *
 * Combines Card, Badge, and Icon atoms to create a selectable mode card
 * with proper keyboard navigation and accessibility.
 *
 * Note: Mock mode for testing/development is controlled via environment
 * variable (e.g., NEXT_PUBLIC_MOCK_MODE=true) and is not user-selectable.
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
  ({ mode, selected, disabled = false, onClick }, ref) => {
    const config = MODE_CONFIG[mode];
    const IconComponent = config.icon;

    const handleClick = () => {
      if (!disabled && onClick) {
        onClick();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onClick) {
          onClick();
        }
      }
    };

    return (
      <Card
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={selected}
        aria-disabled={disabled}
        data-mode={mode}
        data-selected={selected}
        data-disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full cursor-pointer transition-all',
          'hover:shadow-md',
          selected && 'border-primary ring-2 ring-primary ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed hover:shadow-none',
          !disabled && 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <Icon size="lg" className="text-primary">
                <IconComponent />
              </Icon>
              <h3 className="font-semibold text-base">{config.title}</h3>
            </div>

            {selected && (
              <Badge variant="default">Selected</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
        </CardContent>
      </Card>
    );
  }
);

ModeSelectionCard.displayName = 'ModeSelectionCard';
