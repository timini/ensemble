import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import OpenAIMono from '@lobehub/icons/es/OpenAI/components/Mono';
import AnthropicMono from '@lobehub/icons/es/Anthropic/components/Mono';
import DeepMindMono from '@lobehub/icons/es/DeepMind/components/Mono';
import XAIMono from '@lobehub/icons/es/XAI/components/Mono';
import DeepSeekMono from '@lobehub/icons/es/DeepSeek/components/Mono';
import PerplexityMono from '@lobehub/icons/es/Perplexity/components/Mono';
import ClaudeMono from '@lobehub/icons/es/Claude/components/Mono';
import GeminiMono from '@lobehub/icons/es/Gemini/components/Mono';
import GrokMono from '@lobehub/icons/es/Grok/components/Mono';
import type { ProviderLogoProvider } from '../ProviderLogo';

const SIZE_MAP = {
  sm: 20,
  default: 24,
  lg: 32,
  xl: 40,
} as const;

const modelLogoVariants = cva('inline-flex shrink-0 items-center justify-center', {
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

export type ModelLogoProvider = ProviderLogoProvider;

type ModelLogoKey =
  | 'openai'
  | 'anthropic'
  | 'deepmind'
  | 'xai'
  | 'deepseek'
  | 'perplexity'
  | 'claude'
  | 'gemini'
  | 'grok';

export interface ModelLogoProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof modelLogoVariants> {
  /** The provider that owns the model */
  provider: ModelLogoProvider;
  /** Optional model display name (e.g., "Claude Sonnet 4.6") */
  modelName?: string;
  /** Optional model identifier (e.g., "claude-sonnet-4-6") */
  modelId?: string;
}

const MODEL_ICON_KEYS: Record<ModelLogoProvider, ModelLogoKey> = {
  openai: 'openai',
  anthropic: 'claude',
  google: 'gemini',
  xai: 'grok',
  deepseek: 'deepseek',
  perplexity: 'perplexity',
};

const PROVIDER_FALLBACK_KEYS: Record<ModelLogoProvider, ModelLogoKey> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'deepmind',
  xai: 'xai',
  deepseek: 'deepseek',
  perplexity: 'perplexity',
};

const MODEL_NAME_MATCHERS: Partial<Record<ModelLogoProvider, RegExp>> = {
  anthropic: /\bclaude\b/i,
  google: /\bgemini\b/i,
  xai: /\bgrok\b/i,
};

type IconComponent = React.ComponentType<{ size?: number }>;

const LOGO_COMPONENTS: Record<ModelLogoKey, IconComponent> = {
  openai: OpenAIMono,
  anthropic: AnthropicMono,
  deepmind: DeepMindMono,
  xai: XAIMono,
  deepseek: DeepSeekMono,
  perplexity: PerplexityMono,
  claude: ClaudeMono,
  gemini: GeminiMono,
  grok: GrokMono,
};

function resolveModelLogoKey(
  provider: ModelLogoProvider,
  modelName?: string,
  modelId?: string,
): ModelLogoKey {
  const matcher = MODEL_NAME_MATCHERS[provider];
  if (!matcher) {
    return MODEL_ICON_KEYS[provider];
  }

  const signal = `${modelName ?? ''} ${modelId ?? ''}`.trim();
  if (signal.length > 0 && !matcher.test(signal)) {
    return PROVIDER_FALLBACK_KEYS[provider];
  }

  return MODEL_ICON_KEYS[provider];
}

/**
 * Wrapper that strips `<title>` elements from lobehub icon SVGs
 * to prevent duplicate accessible text when used beside model labels.
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
 * ModelLogo atom for displaying model-brand logos while preserving
 * provider fallbacks when the model family cannot be inferred.
 */
const ModelLogo = React.forwardRef<HTMLSpanElement, ModelLogoProps>(
  ({ className, size, provider, modelName, modelId, ...props }, ref) => {
    const logoKey = resolveModelLogoKey(provider, modelName, modelId);
    const IconComponent = LOGO_COMPONENTS[logoKey];
    const pxSize = SIZE_MAP[size || 'default'];

    return (
      <span
        ref={ref}
        className={cn(modelLogoVariants({ size }), className)}
        role="img"
        aria-label={`${provider} model logo`}
        data-testid={`model-logo-${provider}`}
        data-provider={provider}
        data-size={size || 'default'}
        data-logo-key={logoKey}
        {...props}
      >
        <TitleStripper>
          <IconComponent size={pxSize} />
        </TitleStripper>
      </span>
    );
  },
);

ModelLogo.displayName = 'ModelLogo';

export { ModelLogo, modelLogoVariants, resolveModelLogoKey };
