import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { ConsensusMethod } from '@ensemble-ai/shared-utils/consensus';
import type { RunEstimate } from '@ensemble-ai/shared-utils/pricing';
import type { ProviderLogoProvider } from '../../atoms/ProviderLogo';
import { ModelChip } from '../../molecules/ModelChip';
import { ModelPicker, type ModelPickerOption } from '../../molecules/ModelPicker';
import { MethodMenu, type SummarizerOption } from '../../molecules/MethodMenu';
import { ComposerOptions } from '../../molecules/ComposerOptions';
import { ComposerSubmit } from '../../molecules/ComposerSubmit';
import { cn } from '../../../lib/utils';

/** A model in the ensemble. */
export interface ComposerModel {
  /** `provider/model` id. */
  id: string;
  name: string;
  provider: ProviderLogoProvider;
}

/** An answer added by hand. */
export interface ComposerManualResponse {
  id: string;
  label: string;
}

export interface ComposerProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  /** Runs the ensemble. Called from the Ask button and from Ctrl or Cmd + Enter. */
  onSubmit: () => void;
  models: ComposerModel[];
  onRemoveModel: (id: string) => void;
  /** Every model the user can add, for the inline picker. */
  modelOptions: ModelPickerOption[];
  onToggleModel: (id: string) => void;
  /** Most models in one run. Defaults to 6. */
  maxModels?: number;
  manualResponses?: ComposerManualResponse[];
  onRemoveManualResponse?: (id: string) => void;
  method: ConsensusMethod;
  onMethodChange: (method: ConsensusMethod) => void;
  /** estimateRun result for each method, shown in the method menu. */
  estimates: Partial<Record<ConsensusMethod, RunEstimate>>;
  summarizers?: SummarizerOption[];
  summarizerId?: string;
  onSummarizerChange?: (id: string) => void;
  /** Top N for the Ranked method, passed to the method menu. */
  topN?: number;
  onTopNChange?: (n: number) => void;
  topNMax?: number;
  /** Opens the manual answer sheet. */
  onAddManualResponse?: () => void;
  onSavePreset?: () => void;
  /** A run is in progress: the prompt stays editable but cannot be sent again. */
  running?: boolean;
  /** Cancels the run. While running, a Stop button replaces Ask. */
  onStop?: () => void;
  /** Why Ask is blocked (Pro: too few credits). Shown under the models; disables Ask and the shortcut. */
  blockedReason?: string;
  className?: string;
}

/**
 * Composer organism: the top of the workspace. The prompt, the models as
 * chips with an inline picker, the consensus method with its calls and cost,
 * and the Ask button, in one card. Ctrl or Cmd + Enter sends the prompt.
 * During a run the models are locked but answers can still be added by hand.
 * With no model chosen, a hint beside the picker says why Ask is disabled.
 * With `onStop`, a Stop button replaces Ask during a run. A `blockedReason`
 * disables Ask and is shown as a hint.
 *
 * @example
 * ```tsx
 * <Composer prompt={prompt} onPromptChange={setPrompt} onSubmit={run}
 *   models={models} onRemoveModel={remove} modelOptions={options} onToggleModel={toggle}
 *   method={method} onMethodChange={setMethod} estimates={estimates} />
 * ```
 */
export function Composer(props: ComposerProps) {
  const { prompt, models, manualResponses = [], running = false } = props;
  const { t } = useTranslation();
  const promptId = React.useId();
  const hintId = React.useId();
  const blockedId = React.useId();
  const [modKey, setModKey] = React.useState('Ctrl');
  const keys = `${modKey} ${t('organisms.composer.enter')}`;
  const noModels = models.length + manualResponses.length === 0;
  const blocked = Boolean(props.blockedReason) && !running;
  const canSubmit = prompt.trim().length > 0 && !noModels && !running && !blocked;
  const describedBy = [noModels && hintId, blocked && blockedId].filter(Boolean).join(' ') || undefined;

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) setModKey('⌘');
  }, []);

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (canSubmit) props.onSubmit();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit(event);
  };

  return (
    <form
      onSubmit={submit}
      data-testid="composer"
      data-running={running ? 'true' : undefined}
      className={cn(
        'relative rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-base focus-within:border-ring/60 focus-within:shadow-md',
        props.className,
      )}
    >
      <label htmlFor={promptId} className="sr-only">
        {t('organisms.composer.promptLabel')}
      </label>
      <textarea
        id={promptId}
        rows={2}
        value={prompt}
        onChange={(e) => props.onPromptChange(e.target.value)}
        onKeyDown={onKeyDown}
        aria-keyshortcuts="Control+Enter Meta+Enter"
        placeholder={t('organisms.composer.placeholder')}
        data-testid="composer-prompt"
        className="block max-h-60 min-h-[4.5rem] w-full resize-none rounded-t-2xl bg-transparent px-4 pb-2 pt-4 text-body [field-sizing:content] placeholder:text-muted-foreground focus:outline-none sm:px-5"
      />
      <div data-testid="composer-model-row" className="flex items-start gap-2 px-3 pb-3 sm:px-4">
        <div role="group" aria-label={t('organisms.composer.models')} className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {models.map((m) => (
            <ModelChip key={m.id} modelId={m.id} name={m.name} provider={m.provider} onRemove={running ? undefined : () => props.onRemoveModel(m.id)} />
          ))}
          {manualResponses.map((r) => (
            <ModelChip
              key={r.id}
              modelId={r.id}
              name={r.label}
              kind="manual"
              onRemove={running || !props.onRemoveManualResponse ? undefined : () => props.onRemoveManualResponse?.(r.id)}
            />
          ))}
          <ModelPicker
            options={props.modelOptions}
            selectedIds={models.map((m) => m.id)}
            onToggle={props.onToggleModel}
            max={props.maxModels}
            disabled={running}
          />
          {noModels && (
            <span id={hintId} data-testid="composer-models-hint" className="px-1 text-caption text-muted-foreground">
              {t('organisms.composer.modelsHint')}
            </span>
          )}
        </div>
        {/* Here rather than beside Ask, where the French cost label leaves no room. The question announces it. */}
        <kbd
          data-testid="composer-shortcut"
          aria-hidden="true"
          title={t('organisms.composer.shortcut', { keys })}
          className="hidden h-8 shrink-0 items-center whitespace-nowrap font-sans text-caption text-muted-foreground md:flex"
        >
          {keys}
        </kbd>
      </div>
      {blocked && (
        <p id={blockedId} data-testid="composer-blocked-hint" className="px-4 pb-3 text-caption text-warning sm:px-5">
          {props.blockedReason}
        </p>
      )}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5 sm:px-4">
        <MethodMenu
          method={props.method}
          onMethodChange={props.onMethodChange}
          estimates={props.estimates}
          summarizers={props.summarizers}
          summarizerId={props.summarizerId}
          onSummarizerChange={props.onSummarizerChange}
          topN={props.topN}
          onTopNChange={props.onTopNChange}
          topNMax={props.topNMax}
          disabled={running}
        />
        <div className="ml-auto flex items-center gap-1">
          {/* Answers added by hand join a run in progress, so the menu stays available. */}
          <ComposerOptions onAddManualResponse={props.onAddManualResponse} onSavePreset={props.onSavePreset} />
          <ComposerSubmit running={running} disabled={!canSubmit} describedBy={describedBy} onStop={props.onStop} />
        </div>
      </div>
    </form>
  );
}
