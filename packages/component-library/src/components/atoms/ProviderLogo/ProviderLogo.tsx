import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import OpenAIMono from '@lobehub/icons/es/OpenAI/components/Mono';
import AnthropicMono from '@lobehub/icons/es/Anthropic/components/Mono';
import GeminiMono from '@lobehub/icons/es/Gemini/components/Mono';
import XAIMono from '@lobehub/icons/es/XAI/components/Mono';
import DeepSeekMono from '@lobehub/icons/es/DeepSeek/components/Mono';

const SIZE_MAP = {
  sm: 20,
  default: 24,
  lg: 32,
  xl: 40,
} as const;

const providerLogoVariants = cva('inline-flex shrink-0 items-center justify-center', {
  variants: {
    size: {
      sm: 'h-5 w-5',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-10 w-10',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export type ProviderLogoProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek';

export interface ProviderLogoProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof providerLogoVariants> {
  /** The AI provider to display the logo for */
  provider: ProviderLogoProvider;
}

const PROVIDER_ICONS: Record<ProviderLogoProvider, typeof OpenAIMono> = {
  openai: OpenAIMono,
  anthropic: AnthropicMono,
  google: GeminiMono,
  xai: XAIMono,
  deepseek: DeepSeekMono,
};

/**
 * Wrapper that strips `<title>` elements from lobehub icon SVGs
 * to prevent duplicate accessible text when used inside labels/badges.
 */
const TitleStripper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const title = containerRef.current?.querySelector('svg > title');
    if (title) title.remove();
  }, []);

  return <span ref={containerRef}>{children}</span>;
};

/**
 * ProviderLogo atom for displaying AI provider brand logos.
 *
 * Uses official brand icons from @lobehub/icons.
 *
 * @example
 * ```tsx
 * <ProviderLogo provider="openai" size="lg" />
 * <ProviderLogo provider="anthropic" />
 * <ProviderLogo provider="google" size="sm" />
 * ```
 */
const ProviderLogo = React.forwardRef<HTMLSpanElement, ProviderLogoProps>(
  ({ className, size, provider, ...props }, ref) => {
    const IconComponent = PROVIDER_ICONS[provider];
    const pxSize = SIZE_MAP[size || 'default'];

    return (
      <span
        ref={ref}
        className={cn(providerLogoVariants({ size }), className)}
        role="img"
        aria-label={`${provider} logo`}
        data-testid={`provider-logo-${provider}`}
        data-provider={provider}
        data-size={size || 'default'}
        {...props}
      >
        <TitleStripper>
          <IconComponent size={pxSize} />
        </TitleStripper>
      </span>
    );
  }
);

ProviderLogo.displayName = 'ProviderLogo';

export { ProviderLogo, providerLogoVariants };
