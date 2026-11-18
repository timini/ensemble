import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Plus, Search, Trash2 } from 'lucide-react';
import type { AgreementLevel } from '../../atoms/AgreementRing';
import { cn } from '../../../lib/utils';
import { groupHistory, historyTime } from './historyGroups';

/** One past run. */
export interface HistoryItem {
  id: string;
  prompt: string;
  /**
   * When the run started, in epoch milliseconds. Leave it out when the time
   * is not known: the run is then listed last, with no date group heading
   * and no time, rather than with a made-up one.
   */
  createdAt?: number;
  /** Agreement level of the run, when it was scored. */
  level?: AgreementLevel;
  /** More text the search matches but the row does not show: answers, consensus, model names. */
  searchText?: string;
}

/** A saved set of models. */
export interface HistoryPreset {
  id: string;
  name: string;
  modelCount: number;
}

export interface HistorySidebarProps {
  items: HistoryItem[];
  presets: HistoryPreset[];
  /** Run shown in the workspace. */
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectPreset: (id: string) => void;
  /** Shows a delete button on presets when set. */
  onDeletePreset?: (id: string) => void;
  onNewQuestion?: () => void;
  /**
   * True while a run is in progress. Other runs cannot be opened then (their
   * rows are disabled and a note says why), so the live run is not replaced
   * before its answers are in. Deleting a run still works.
   */
  locked?: boolean;
  /** Reference time for the date groups. Defaults to now. */
  now?: number;
  className?: string;
}

const ROW = 'focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-label transition-colors duration-fast hover:bg-muted';
const LABEL = 'px-2.5 pb-1 text-caption font-medium uppercase tracking-wider text-muted-foreground';
const DOT: Record<AgreementLevel, string> = { high: 'bg-success', medium: 'bg-warning', low: 'bg-destructive' };
const DELETE =
  'focus-ring absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity duration-fast hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100';

/**
 * HistorySidebar organism: past runs (kept in the browser in Free mode)
 * grouped by date with their agreement level, presets, search and delete.
 * The sidebar on desktop and the content of the history sheet on mobile.
 *
 * @example
 * ```tsx
 * <HistorySidebar items={runs} presets={presets} activeId={id}
 *   onSelect={open} onDelete={remove} onSelectPreset={applyPreset} />
 * ```
 */
export function HistorySidebar(props: HistorySidebarProps) {
  const { items, presets, activeId, onDeletePreset, locked = false } = props;
  const { t, i18n } = useTranslation();
  const [query, setQuery] = React.useState('');
  const base = React.useId();
  const key = 'organisms.historySidebar';
  const needle = query.trim().toLowerCase();
  const match = (text: string) => !needle || text.toLowerCase().includes(needle);
  const shownPresets = presets.filter((p) => match(p.name));
  const shownItems = items.filter((i) => match(i.prompt) || (!!i.searchText && match(i.searchText)));
  const groups = groupHistory(shownItems, props.now ?? Date.now());

  return (
    <div data-testid="history-sidebar" className={cn('flex flex-col gap-6', props.className)}>
      <div className="space-y-2">
        {props.onNewQuestion && (
          <button type="button" onClick={props.onNewQuestion} data-testid="history-new" className="focus-ring flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-label font-medium shadow-sm transition-colors duration-fast hover:bg-muted">
            <Plus className="size-4" aria-hidden="true" />
            {t(`${key}.newQuestion`)}
          </button>
        )}
        {(items.length > 0 || presets.length > 0) && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              data-testid="history-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t(`${key}.search`)}
              placeholder={t(`${key}.search`)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-label placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
            />
          </div>
        )}
      </div>

      {shownPresets.length > 0 && (
        <section aria-labelledby={`${base}-presets`}>
          <h2 id={`${base}-presets`} className={LABEL}>{t(`${key}.presets`)}</h2>
          <ul>
            {shownPresets.map((p) => (
              <li key={p.id} data-testid="history-preset" className="group relative">
                <button type="button" onClick={() => props.onSelectPreset(p.id)} className={cn(ROW, onDeletePreset && 'pr-9')}>
                  <Layers className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className={cn('text-caption tabular-nums text-muted-foreground', onDeletePreset && 'group-hover:invisible')}>
                    {t(`${key}.models`, { count: p.modelCount })}
                  </span>
                </button>
                {onDeletePreset && (
                  <button type="button" onClick={() => onDeletePreset(p.id)} aria-label={t(`${key}.deletePreset`, { name: p.name })} className={DELETE}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {locked && items.some((i) => i.id !== activeId) && (
        <p data-testid="history-locked" role="status" className="px-2.5 text-caption text-muted-foreground">{t(`${key}.locked`)}</p>
      )}

      {groups.map(({ group, items: rows }) => (
        <section key={group} aria-labelledby={`${base}-${group}`}>
          <h2 id={`${base}-${group}`} className={group === 'undated' ? 'sr-only' : LABEL}>{t(`${key}.${group}`)}</h2>
          <ul>
            {rows.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id} data-testid="history-item" className="group relative">
                  <button
                    type="button"
                    onClick={() => props.onSelect(item.id)}
                    disabled={locked && !active}
                    aria-current={active || undefined}
                    className={cn(
                      ROW,
                      'pr-9 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent',
                      active && 'bg-accent text-accent-foreground hover:bg-accent',
                    )}
                  >
                    <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', item.level ? DOT[item.level] : 'bg-border')} />
                    {item.level && <span className="sr-only">{t(`molecules.agreementSummary.levels.${item.level}.label`)}:</span>}
                    <span className="flex-1 truncate">{item.prompt}</span>
                    {group !== 'undated' && item.createdAt !== undefined && (
                      <span className="text-caption tabular-nums text-muted-foreground group-hover:invisible">
                        {historyTime(item.createdAt, group, i18n.language || 'en')}
                      </span>
                    )}
                  </button>
                  <button type="button" onClick={() => props.onDelete(item.id)} aria-label={t(`${key}.delete`, { prompt: item.prompt })} className={DELETE}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {items.length === 0 && !needle && (
        <p data-testid="history-empty" className="px-2.5 text-caption text-muted-foreground">{t(`${key}.empty`)}</p>
      )}
      {needle && groups.length === 0 && shownPresets.length === 0 && (
        <p data-testid="history-no-matches" className="px-2.5 text-caption text-muted-foreground">{t(`${key}.noMatches`, { query: query.trim() })}</p>
      )}
    </div>
  );
}
