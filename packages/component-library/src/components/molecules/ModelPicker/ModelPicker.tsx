import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Search } from 'lucide-react';
import { ModelLogo } from '../../atoms/ModelLogo';
import type { ProviderLogoProvider } from '../../atoms/ProviderLogo';
import { usePopover } from '../../../lib/usePopover';
import { moveFocus } from '../../../lib/rovingFocus';
import { cn } from '../../../lib/utils';

/** A model the user can add to the ensemble. */
export interface ModelPickerOption {
  /** `provider/model` id. */
  id: string;
  name: string;
  provider: ProviderLogoProvider;
  /** Heading the model is listed under: a provider or an endpoint name. */
  group: string;
  /** Short price label, such as `$1.25` per million output tokens or `Free`. */
  price?: string;
}

export interface ModelPickerProps {
  options: ModelPickerOption[];
  selectedIds: string[];
  /** Adds or removes the model with this id. */
  onToggle: (id: string) => void;
  /** Most models in one run. Defaults to 6. */
  max?: number;
  /** Start with the panel open (stories). */
  defaultOpen?: boolean;
  disabled?: boolean;
  className?: string;
}

const OPTION = '[data-testid="model-picker-option"]';

/**
 * ModelPicker molecule: the "Add model" chip in the composer and its inline
 * panel. Search, models grouped by provider or endpoint, a price per model
 * and a limit of six. Arrow keys move through the list; Enter in the search
 * box moves to the first match (it never submits a surrounding form);
 * Escape closes.
 *
 * @example
 * ```tsx
 * <ModelPicker options={options} selectedIds={ids} onToggle={toggle} />
 * ```
 */
export function ModelPicker({ options, selectedIds, onToggle, max = 6, defaultOpen = false, disabled, className }: ModelPickerProps) {
  const { t } = useTranslation();
  const popover = usePopover(defaultOpen);
  const [query, setQuery] = React.useState('');
  const listRef = React.useRef<HTMLDivElement>(null);
  const atLimit = selectedIds.length >= max;
  const needle = query.trim().toLowerCase();
  const visible = options.filter((o) => !needle || `${o.name} ${o.group}`.toLowerCase().includes(needle));
  const groups = [...new Set(visible.map((o) => o.group))];

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (moveFocus(listRef.current, OPTION, event.key) >= 0) event.preventDefault();
  };

  // The picker sits inside the composer form, so Enter in the search box
  // would submit the form and start a run. Move to the first match instead.
  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    moveFocus(listRef.current, OPTION, 'Home');
  };

  return (
    <div className={cn('sm:relative', className)}>
      <button
        type="button"
        ref={popover.triggerRef}
        {...popover.triggerProps}
        disabled={disabled}
        data-testid="model-picker-trigger"
        className="focus-ring inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-input/70 px-3 text-label text-muted-foreground transition-colors duration-fast hover:border-solid hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {selectedIds.length ? t('molecules.modelPicker.add') : t('molecules.modelPicker.choose')}
      </button>
      {popover.open && (
        <div
          ref={popover.panelRef}
          id={popover.panelId}
          data-testid="model-picker-panel"
          onKeyDown={onKeyDown}
          className="absolute inset-x-3 z-30 mt-2 animate-rise-in rounded-xl border border-border bg-popover text-popover-foreground shadow-lg sm:inset-x-auto sm:left-0 sm:top-full sm:w-80"
        >
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              aria-label={t('molecules.modelPicker.search')}
              placeholder={t('molecules.modelPicker.search')}
              className="h-11 w-full rounded-t-xl bg-transparent pl-9 pr-3 text-label placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5">
            {visible.length === 0 && (
              <p data-testid="model-picker-empty" className="px-2.5 py-6 text-center text-label text-muted-foreground">
                {options.length === 0 ? t('molecules.modelPicker.empty') : t('molecules.modelPicker.noMatches', { query })}
              </p>
            )}
            {groups.map((group) => (
              <div key={group} role="group" aria-label={group} className="pb-1">
                <p aria-hidden="true" className="px-2.5 pb-1 pt-2 text-caption font-medium uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                {visible
                  .filter((o) => o.group === group)
                  .map((o) => {
                    const on = selectedIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={on}
                        disabled={!on && atLimit}
                        onClick={() => onToggle(o.id)}
                        data-testid="model-picker-option"
                        className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-label transition-colors duration-fast hover:bg-muted disabled:opacity-50"
                      >
                        <ModelLogo provider={o.provider} modelName={o.name} size="sm" />
                        <span className="flex-1 truncate">{o.name}</span>
                        {o.price && <span className="text-caption tabular-nums text-muted-foreground">{o.price}</span>}
                        <Check className={cn('size-4 text-primary', !on && 'invisible')} aria-hidden="true" />
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
          <p className="border-t border-border px-4 py-2.5 text-caption text-muted-foreground">
            <span data-testid="model-picker-count">{t('molecules.modelPicker.selected', { count: selectedIds.length, max })}</span>
            {atLimit && (
              <span data-testid="model-picker-limit" className="block text-warning">
                {t('molecules.modelPicker.limit', { max })}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
