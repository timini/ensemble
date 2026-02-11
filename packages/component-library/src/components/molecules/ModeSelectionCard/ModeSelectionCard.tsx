import * as React from 'react';
import { useTranslation } from 'react-i18next';
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
  /** Show "Coming Soon" in button (for Pro mode) */
  comingSoon?: boolean;
}

const MODE_CONFIG = {
  free: {
    icon: '🔧',
  },
  pro: {
    icon: '⭐',
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
  ({ mode, selected = false, disabled = false, onClick, comingSoon = false }, ref) => {
    const { t } = useTranslation();
    const config = MODE_CONFIG[mode];

    return (
      <Card
        ref={ref}
        data-testid={`mode-card-${mode}`}
        data-mode={mode}
        data-selected={selected}
        data-disabled={disabled}
        className={cn(
          'border-2 border-border hover:border-primary/30 transition-colors flex flex-col',
          selected && 'border-primary bg-primary/10',
          disabled && 'opacity-60'
        )}
      >
        <CardContent className="p-6 flex flex-col flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center">
              <span className="text-primary text-lg">{config.icon}</span>
            </div>
            <h4 className="text-xl font-semibold text-foreground">{t(`molecules.modeSelectionCard.${mode}.title`)}</h4>
          </div>
          <p className="text-muted-foreground mb-6 flex-1">{t(`molecules.modeSelectionCard.${mode}.description`)}</p>
          <Button
            className="w-full"
            onClick={onClick}
            disabled={disabled}
          >
            {comingSoon ? 'Coming Soon' : t(`molecules.modeSelectionCard.${mode}.buttonText`)}
          </Button>
        </CardContent>
      </Card>
    );
  }
);

ModeSelectionCard.displayName = 'ModeSelectionCard';
