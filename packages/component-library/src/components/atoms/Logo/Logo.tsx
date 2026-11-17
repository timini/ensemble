import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';

export interface LogoProps {
  /** Show the name next to the mark. Defaults to true. */
  wordmark?: boolean;
  className?: string;
}

/**
 * Logo atom: three overlapping circles (several models, one shared answer)
 * and the name in the display face. Wrap it in a link where it leads home.
 *
 * @example
 * ```tsx
 * <a href="/"><Logo /></a>
 * ```
 */
export function Logo({ wordmark = true, className }: LogoProps) {
  const { t } = useTranslation();
  const name = t('atoms.logo.name');
  return (
    <span data-testid="logo" className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <svg
        viewBox="0 0 28 20"
        className="h-5 w-7 shrink-0 text-primary"
        {...(wordmark ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
      >
        <circle cx="8" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="14" cy="10" r="7" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="20" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      {wordmark && <span className="font-display text-[1.375rem] leading-none tracking-tight">{name}</span>}
    </span>
  );
}
