import { useTranslation } from 'react-i18next';
import { CommandSnippet } from '../../atoms/CommandSnippet';

/** Why a run has no agreement score. */
export type AgreementUnavailableReason = 'noEmbeddings' | 'error' | 'tooFewAnswers';

export interface AgreementUnavailableProps {
  reason: AgreementUnavailableReason;
  /** Shell command that installs a local embedding model, shown for `noEmbeddings`. */
  command?: string;
  /** Opens settings, offered for `noEmbeddings`. */
  onOpenSettings?: () => void;
}

/**
 * The body of AgreementSummary when there is no score: why, and for a
 * missing embedding model, the way to add one (settings or a pull command).
 */
export function AgreementUnavailable({ reason, command, onOpenSettings }: AgreementUnavailableProps) {
  const { t } = useTranslation();
  const key = 'molecules.agreementSummary';
  const hint = reason === 'noEmbeddings' && command ? 'commandHint' : { noEmbeddings: 'unavailableHint', error: 'errorHint', tooFewAnswers: 'tooFewHint' }[reason];
  return (
    <div data-testid="agreement-unavailable" data-reason={reason} className="mt-4 space-y-3">
      <div className="space-y-1">
        <p className="text-label font-medium">{t(`${key}.unavailable`)}</p>
        <p className="text-label text-muted-foreground">{t(`${key}.${hint}`)}</p>
      </div>
      {reason === 'noEmbeddings' && command && <CommandSnippet command={command} data-testid="agreement-command" />}
      {reason === 'noEmbeddings' && onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          data-testid="agreement-open-settings"
          className="focus-ring rounded text-label font-medium text-primary hover:underline"
        >
          {t(`${key}.openSettings`)}
        </button>
      )}
    </div>
  );
}
