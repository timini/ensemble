/**
 * Date bands the history list is split into. `undated` holds runs with no
 * known time (stored before run times were kept); they come last.
 */
export type HistoryGroup = 'today' | 'week' | 'older' | 'undated';

const DAY = 86_400_000;

/**
 * Sorts runs newest first and splits them into today (since local
 * midnight), the previous 7 days, older and undated (no `createdAt`).
 * Empty groups are left out.
 */
export function groupHistory<T extends { createdAt?: number }>(items: T[], now: number): Array<{ group: HistoryGroup; items: T[] }> {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const today = midnight.getTime();
  const band = (t: number | undefined): HistoryGroup =>
    t === undefined ? 'undated' : t >= today ? 'today' : t >= today - 7 * DAY ? 'week' : 'older';
  const sorted = [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return (['today', 'week', 'older', 'undated'] as const)
    .map((group) => ({ group, items: sorted.filter((i) => band(i.createdAt) === group) }))
    .filter((g) => g.items.length > 0);
}

/**
 * Short time label for a run: the time today, the weekday this week, the
 * date before. Never called for the `undated` group.
 */
export function historyTime(createdAt: number, group: Exclude<HistoryGroup, 'undated'>, locale: string): string {
  const options: Intl.DateTimeFormatOptions =
    group === 'today' ? { hour: 'numeric', minute: '2-digit' } : group === 'week' ? { weekday: 'short' } : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat(locale, options).format(createdAt);
}
