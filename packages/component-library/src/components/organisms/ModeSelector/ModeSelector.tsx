import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ModeSelectionCard } from '../../molecules/ModeSelectionCard';
import { Heading } from '../../atoms/Heading';

export type Mode = 'free' | 'pro';

export interface ModeSelectorProps {
  /** Currently selected mode */
  selectedMode?: Mode;
  /** Callback when Free Mode is selected */
  onSelectFreeMode: () => void;
  /** Callback when Pro Mode is selected */
  onSelectProMode: () => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether Free Mode should be disabled independently */
  freeModeDisabled?: boolean;
  /** Whether Pro Mode is disabled (shows "Coming Soon") */
  proModeDisabled?: boolean;
}

/**
 * ModeSelector organism for choosing between Free and Pro modes.
 *
 * Composes ModeSelectionCard molecules to display mode options.
 * Free Mode allows users to bring their own API keys, while Pro Mode offers
 * credits for access to all providers.
 *
 * @example
 * ```tsx
 * <ModeSelector
 *   selectedMode="free"
 *   onSelectFreeMode={() => console.log('Free mode selected')}
 *   onSelectProMode={() => console.log('Pro mode selected')}
 * />
 * ```
 */
export const ModeSelector = React.forwardRef<HTMLDivElement, ModeSelectorProps>(
  (
    {
      selectedMode,
      onSelectFreeMode,
      onSelectProMode,
      disabled = false,
      freeModeDisabled = false,
      proModeDisabled = false,
    },
    ref,
  ) => {
    const { t } = useTranslation();

    const isFreeDisabled = disabled || freeModeDisabled;
    const isProDisabled = disabled || proModeDisabled;

    return (
      <div ref={ref} data-testid="mode-selector">
        <Heading level={3} size="lg" className="mb-6">
          {t('organisms.modeSelector.heading')}
        </Heading>

        <div className="grid grid-cols-2 gap-6">
          <ModeSelectionCard
            mode="free"
            selected={selectedMode === 'free'}
            disabled={isFreeDisabled}
            onClick={onSelectFreeMode}
          />

          <ModeSelectionCard
            mode="pro"
            selected={selectedMode === 'pro'}
            disabled={isProDisabled}
            onClick={onSelectProMode}
            comingSoon={proModeDisabled}
          />
        </div>
      </div>
    );
  }
);

ModeSelector.displayName = 'ModeSelector';
