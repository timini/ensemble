import { useTranslation } from 'react-i18next';
import { ArrowRight, Cpu, KeyRound, Sparkles } from 'lucide-react';
import { buttonVariants } from '../../atoms/Button';
import { cn } from '../../../lib/utils';

export interface WaysInProps {
  /** Where "Use your own keys" leads (the workspace with the keys step of onboarding). */
  keysHref: string;
  /** Where "Use local models" leads. */
  localHref: string;
  /** Where "Sign in for Pro" leads. Without it (no sign-in on this server) Pro shows as coming soon. */
  proHref?: string;
  className?: string;
}

/**
 * WaysIn molecule: the three ways into the product, in the order most
 * visitors start. Own keys is the main action, local models the second.
 * Pro is a quiet link, or coming soon when the server has no sign-in.
 *
 * @example
 * ```tsx
 * <WaysIn keysHref="/workspace?start=keys" localHref="/workspace?start=local" />
 * ```
 */
export function WaysIn({ keysHref, localHref, proHref, className }: WaysInProps) {
  const { t } = useTranslation();
  const key = 'molecules.waysIn';
  return (
    <div data-testid="ways-in" className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a href={keysHref} data-testid="ways-in-keys" className={buttonVariants({ size: 'lg' })}>
          <KeyRound aria-hidden="true" /> {t(`${key}.keys`)} <ArrowRight aria-hidden="true" />
        </a>
        <a href={localHref} data-testid="ways-in-local" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
          <Cpu aria-hidden="true" /> {t(`${key}.local`)}
        </a>
      </div>
      <p className="text-caption text-muted-foreground">{t(`${key}.oneKey`)}</p>
      {proHref ? (
        <a
          href={proHref}
          data-testid="ways-in-pro"
          className="focus-ring inline-flex items-center gap-2 rounded-md text-label text-muted-foreground hover:text-foreground"
        >
          <Sparkles className="size-4" aria-hidden="true" /> {t(`${key}.pro`)}
        </a>
      ) : (
        <p data-testid="ways-in-pro" data-available="false" className="flex items-center gap-2 text-label text-muted-foreground">
          <Sparkles className="size-4 shrink-0" aria-hidden="true" /> {t(`${key}.pro`)}
          <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-caption">{t(`${key}.soon`)}</span>
        </p>
      )}
    </div>
  );
}
