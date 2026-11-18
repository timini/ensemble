import type { AgreementLevel } from '../../atoms/AgreementRing';

/** Class names shared by the HistorySidebar rows. */
export const ROW = 'focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-label transition-colors duration-fast hover:bg-muted';
export const LABEL = 'px-2.5 pb-1 text-caption font-medium uppercase tracking-wider text-muted-foreground';
export const DOT: Record<AgreementLevel, string> = { high: 'bg-success', medium: 'bg-warning', low: 'bg-destructive' };
export const ROW_ACTION =
  'focus-ring absolute top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity duration-fast focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100';
export const DELETE = `${ROW_ACTION} right-1.5 hover:text-destructive`;
export const SHARE = `${ROW_ACTION} right-9 hover:text-primary`;
