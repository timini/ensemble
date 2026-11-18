import { useTranslation } from 'react-i18next';
import { EndpointLogo } from '../../atoms/EndpointLogo';
import { CommandSnippet } from '../../atoms/CommandSnippet';
import { LocalServerHelp } from '../LocalServerHelp';
import { cn } from '@/lib/utils';

/**
 * `found`: Ollama answered. `ask`: the app may not look on its own (a hosted
 * page needs a click before the browser's local network prompt). `checking`:
 * the user's check is running. `notFound`: the user's check found nothing.
 */
export type OllamaNoticeState = 'ask' | 'checking' | 'found' | 'notFound';

export interface OllamaDetectedNoticeProps {
  state: OllamaNoticeState;
  /** Installed chat models, when found. */
  chatModels?: string[];
  /** Installed embedding model that will score agreement, when found. */
  embeddingModel?: string;
  /** Command that installs the suggested embedding model. */
  embeddingPullCommand: string;
  /** Command that installs a suggested small chat model. */
  chatPullCommand: string;
  /** The page is not on the user's computer, so the browser may block the check. */
  hosted: boolean;
  /** Command that runs Ensemble locally. */
  localRunCommand: string;
  /** Address the app looked for Ollama at, named when nothing answered. */
  probeUrl: string;
  /** Link to the local models guide. */
  guideUrl?: string;
  /** Add Ollama as an endpoint. */
  onAdd: () => void;
  /** Look for Ollama (after a click, so a permission prompt is expected). */
  onCheck: () => void;
  /** Hide the notice. */
  onDismiss: () => void;
  className?: string;
}

const buttonClass =
  'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';

/**
 * OllamaDetectedNotice molecule: on the configuration page, offers to add a
 * running Ollama with one click and lists its installed models. When the app
 * may not look by itself, it offers a button that looks; when nothing
 * answers, it says how to start Ollama or run Ensemble locally.
 *
 * @example
 * ```tsx
 * <OllamaDetectedNotice state="found" chatModels={['llama3.2:3b']} embeddingModel="nomic-embed-text"
 *   embeddingPullCommand="ollama pull nomic-embed-text" chatPullCommand="ollama pull llama3.2:3b"
 *   hosted={false} localRunCommand="npm run local" probeUrl="http://localhost:11434" onAdd={add} onCheck={check} onDismiss={hide} />
 * ```
 */
export function OllamaDetectedNotice({
  state,
  chatModels = [],
  embeddingModel,
  embeddingPullCommand,
  chatPullCommand,
  hosted,
  localRunCommand,
  probeUrl,
  guideUrl,
  onAdd,
  onCheck,
  onDismiss,
  className,
}: OllamaDetectedNoticeProps) {
  const { t } = useTranslation();
  const prefix = 'molecules.ollamaDetectedNotice';
  const found = state === 'found';

  return (
    <section
      role="status"
      data-testid="ollama-notice"
      data-state={state}
      className={cn('space-y-3 rounded-lg border border-info/30 bg-info/10 p-4 text-sm text-foreground', className)}
    >
      <div className="flex items-center gap-2">
        <EndpointLogo preset="ollama" size="sm" aria-hidden="true" />
        <p className="font-semibold">{t(`${prefix}.${state}Title`)}</p>
      </div>

      {found ? (
        <>
          {chatModels.length > 0 ? (
            <p data-testid="ollama-notice-models">
              {t(`${prefix}.models`, { count: chatModels.length, models: chatModels.join(', ') })}
            </p>
          ) : (
            <>
              <p>{t(`${prefix}.noChatModels`)}</p>
              <CommandSnippet command={chatPullCommand} data-testid="ollama-notice-chat-pull" />
            </>
          )}
          {embeddingModel ? (
            <p data-testid="ollama-notice-embedding">{t(`${prefix}.embedding`, { model: embeddingModel })}</p>
          ) : (
            <>
              <p data-testid="ollama-notice-no-embedding">{t(`${prefix}.noEmbedding`)}</p>
              <CommandSnippet command={embeddingPullCommand} data-testid="ollama-notice-embedding-pull" />
            </>
          )}
        </>
      ) : (
        <p>
          {t(`${prefix}.${state === 'notFound' && !hosted ? 'notFoundLocal' : `${state}Description`}`, {
            url: probeUrl,
          })}
        </p>
      )}

      {state === 'notFound' && hosted && (
        <LocalServerHelp
          reason="notFound"
          localRunCommand={localRunCommand}
          guideUrl={guideUrl}
          data-testid="ollama-notice-help"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {found ? (
          <button
            type="button"
            onClick={onAdd}
            data-testid="ollama-notice-add"
            className={cn(buttonClass, 'bg-primary text-primary-foreground hover:bg-primary/90')}
          >
            {t(`${prefix}.add`)}
          </button>
        ) : (
          <button
            type="button"
            onClick={onCheck}
            disabled={state === 'checking'}
            data-testid="ollama-notice-check"
            className={cn(buttonClass, 'bg-primary text-primary-foreground hover:bg-primary/90')}
          >
            {t(`${prefix}.${state === 'checking' ? 'checking' : state === 'notFound' ? 'checkAgain' : 'check'}`)}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          data-testid="ollama-notice-dismiss"
          className={cn(buttonClass, 'border border-input bg-background hover:bg-accent hover:text-accent-foreground')}
        >
          {t(`${prefix}.dismiss`)}
        </button>
      </div>
    </section>
  );
}
