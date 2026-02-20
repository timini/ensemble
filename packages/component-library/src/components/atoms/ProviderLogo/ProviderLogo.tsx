import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

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

/** OpenAI logo SVG */
const OpenAILogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

/** Anthropic logo SVG */
const AnthropicLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.639-4.39H5.163l-1.61 4.39H0L6.57 3.52zm1.04 5.185L5.3 14.265h4.62L7.61 8.704z" />
  </svg>
);

/** Google (Gemini) logo SVG */
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
    <path
      d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z"
      fill="url(#google-gemini-gradient)"
    />
    <path
      d="M12 3.75c4.556 0 8.25 3.694 8.25 8.25s-3.694 8.25-8.25 8.25S3.75 16.556 3.75 12 7.444 3.75 12 3.75z"
      fill="url(#google-gemini-inner)"
    />
    <defs>
      <radialGradient id="google-gemini-gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) scale(12)">
        <stop stopColor="#4285F4" />
        <stop offset=".3" stopColor="#9B72CB" />
        <stop offset=".6" stopColor="#D96570" />
        <stop offset="1" stopColor="#F9AB00" />
      </radialGradient>
      <radialGradient id="google-gemini-inner" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) scale(8.25)">
        <stop stopColor="#fff" stopOpacity=".8" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

/** XAI (Grok) logo SVG */
const XAILogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M2.04 2L10.824 14.496 2.4 22H4.296L11.676 15.696 17.64 22H22.056L12.792 8.856 20.568 2H18.672L11.94 7.644 6.456 2H2.04ZM5.16 3.6H7.32L18.936 20.4H16.776L5.16 3.6Z" />
  </svg>
);

/** DeepSeek logo SVG */
const DeepSeekLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 1.5c4.687 0 8.5 3.813 8.5 8.5s-3.813 8.5-8.5 8.5S3.5 16.687 3.5 12 7.313 3.5 12 3.5zm-2.5 4.5a3 3 0 0 0-3 3c0 1.08.57 2.027 1.425 2.557A4.006 4.006 0 0 0 12 17.5a4.006 4.006 0 0 0 4.075-3.943A3.001 3.001 0 0 0 14.5 8h-5zm0 1.5h5a1.5 1.5 0 0 1 .144 2.993A4.01 4.01 0 0 0 12 10a4.01 4.01 0 0 0-2.644 2.493A1.5 1.5 0 0 1 9.5 9.5zM12 11.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" />
  </svg>
);

const LOGO_COMPONENTS: Record<ProviderLogoProvider, React.FC> = {
  openai: OpenAILogo,
  anthropic: AnthropicLogo,
  google: GoogleLogo,
  xai: XAILogo,
  deepseek: DeepSeekLogo,
};

/**
 * ProviderLogo atom for displaying AI provider brand logos.
 *
 * Renders proper SVG logos for each supported provider with consistent sizing.
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
    const LogoComponent = LOGO_COMPONENTS[provider];

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
        <LogoComponent />
      </span>
    );
  }
);

ProviderLogo.displayName = 'ProviderLogo';

export { ProviderLogo, providerLogoVariants };
