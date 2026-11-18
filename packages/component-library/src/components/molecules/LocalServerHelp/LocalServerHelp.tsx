import { useTranslation } from 'react-i18next';
import { CommandSnippet } from '../../atoms/CommandSnippet';
import { cn } from '@/lib/utils';

/** Why the help is shown: a call to this computer failed, or Ollama was not found. */
export type LocalServerHelpReason = 'blocked' | 'notFound';

export interface LocalServerHelpProps {
  reason: LocalServerHelpReason;
  /** The command that runs Ensemble on the user's computer, such as `npm run local`. */
  localRunCommand: string;
  /** Link to the local models setup guide. No link when unset. */
  guideUrl?: string;
  /** Test id of the block. Defaults to `local-server-help`. */
  'data-testid'?: string;
  className?: string;
}

/**
 * LocalServerHelp molecule: explains that a hosted page may not be allowed to
 * reach servers on the user's computer (Chrome and Firefox ask for local
 * network permission, Safari blocks `http://localhost` from HTTPS pages), and
 * gives the command that runs Ensemble locally, where those calls work.
 *
 * @example
 * ```tsx
 * <LocalServerHelp reason="blocked" localRunCommand="npm run local" guideUrl={guideUrl} />
 * ```
 */
export function LocalServerHelp({
  reason,
  localRunCommand,
  guideUrl,
  className,
  'data-testid': testId = 'local-server-help',
}: LocalServerHelpProps) {
  const { t } = useTranslation();
  const prefix = 'molecules.localServerHelp';

  return (
    <div className={cn('space-y-2 text-sm text-muted-foreground', className)} data-testid={testId} data-reason={reason}>
      <p>{t(`${prefix}.${reason}`)}</p>
      <p>{t(`${prefix}.runLocally`)}</p>
      <CommandSnippet command={localRunCommand} data-testid={`${testId}-command`} />
      {guideUrl && (
        <a
          href={guideUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-primary underline-offset-4 hover:underline"
        >
          {t(`${prefix}.guideLink`)}
        </a>
      )}
    </div>
  );
}
