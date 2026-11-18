import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cva, type VariantProps } from 'class-variance-authority';
import { Cpu, Server } from 'lucide-react';
import OllamaMono from '@lobehub/icons/es/Ollama/components/Mono';
import LmStudioMono from '@lobehub/icons/es/LmStudio/components/Mono';
import VllmMono from '@lobehub/icons/es/Vllm/components/Mono';
import OpenRouterMono from '@lobehub/icons/es/OpenRouter/components/Mono';
import GroqMono from '@lobehub/icons/es/Groq/components/Mono';
import TogetherMono from '@lobehub/icons/es/Together/components/Mono';
import { cn } from '@/lib/utils';

/** Endpoint presets with a logo. Matches the presets in shared-utils. */
export const ENDPOINT_LOGO_PRESETS = [
  'ollama',
  'lmstudio',
  'llamacpp',
  'vllm',
  'openrouter',
  'groq',
  'together',
  'custom',
] as const;

export type EndpointLogoPreset = (typeof ENDPOINT_LOGO_PRESETS)[number];

const SIZE_MAP = { sm: 20, default: 24, lg: 32, xl: 40 } as const;

const endpointLogoVariants = cva('inline-flex shrink-0 items-center justify-center', {
  variants: {
    size: { sm: 'h-5 w-5', default: 'h-6 w-6', lg: 'h-8 w-8', xl: 'h-10 w-10' },
  },
  defaultVariants: { size: 'default' },
});

type IconComponent = React.ComponentType<{ size?: number }>;

const CpuIcon: IconComponent = ({ size }) => <Cpu size={size} aria-hidden="true" />;
const ServerIcon: IconComponent = ({ size }) => <Server size={size} aria-hidden="true" />;

/** llama.cpp has no brand icon in @lobehub/icons, so it gets a generic CPU icon. */
const ICONS: Record<EndpointLogoPreset, IconComponent> = {
  ollama: OllamaMono,
  lmstudio: LmStudioMono,
  llamacpp: CpuIcon,
  vllm: VllmMono,
  openrouter: OpenRouterMono,
  groq: GroqMono,
  together: TogetherMono,
  custom: ServerIcon,
};

/** Product names for the accessible label. Custom is translated instead. */
const PRODUCT_NAMES: Record<Exclude<EndpointLogoPreset, 'custom'>, string> = {
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  llamacpp: 'llama.cpp',
  vllm: 'vLLM',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  together: 'Together AI',
};

export interface EndpointLogoProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof endpointLogoVariants> {
  /** The endpoint preset to show the logo for. Unknown presets get the Custom logo. */
  preset: EndpointLogoPreset;
}

/**
 * EndpointLogo atom: the logo of an OpenAI-compatible endpoint preset
 * (Ollama, LM Studio, OpenRouter and so on), with a generic server icon for
 * Custom endpoints.
 *
 * @example
 * ```tsx
 * <EndpointLogo preset="ollama" size="sm" />
 * ```
 */
export const EndpointLogo = React.forwardRef<HTMLSpanElement, EndpointLogoProps>(
  ({ className, size, preset, ...props }, ref) => {
    const { t } = useTranslation();
    const Icon = ICONS[preset] ?? ServerIcon;
    const name =
      PRODUCT_NAMES[preset as keyof typeof PRODUCT_NAMES] ?? t('molecules.endpointInput.customLabel');
    const iconRef = React.useRef<HTMLSpanElement>(null);
    // lobehub icons carry a <title>; drop it so the label is not read twice.
    React.useEffect(() => {
      iconRef.current?.querySelector('svg > title')?.remove();
    }, [preset]);
    return (
      <span
        ref={ref}
        className={cn(endpointLogoVariants({ size }), className)}
        role="img"
        aria-label={t('atoms.endpointLogo.label', { name })}
        data-testid={`endpoint-logo-${preset}`}
        data-preset={preset}
        data-size={size || 'default'}
        {...props}
      >
        <span ref={iconRef}>
          <Icon size={SIZE_MAP[size || 'default']} />
        </span>
      </span>
    );
  },
);

EndpointLogo.displayName = 'EndpointLogo';

export { endpointLogoVariants };
