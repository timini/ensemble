import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Link2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../atoms/Dialog';
import { Button } from '../../atoms/Button';
import { LoadingSpinner } from '../../atoms/LoadingSpinner';

/**
 * - `loading`: checking whether the run already has a link.
 * - `create` / `creating`: no link yet.
 * - `ready` / `deleting`: the link exists.
 * - `error`: creating or deleting failed (see `error`).
 */
export type ShareDialogStatus = 'loading' | 'create' | 'creating' | 'ready' | 'deleting' | 'error';

/** Why the last request failed. */
export type ShareDialogError = 'failed' | 'limit' | 'tooLarge';

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: ShareDialogStatus;
  /** The link, once it exists. */
  url?: string;
  /** Formatted date the link stops working. */
  expiresOn?: string;
  error?: ShareDialogError;
  onCreate: () => void;
  onDelete: () => void;
  /** Called after the link is copied. */
  onCopy?: () => void;
}

const NOTE = 'text-caption text-muted-foreground';

/**
 * ShareDialog molecule: creates a public read-only link to a run, shows it
 * with a copy button and its expiry date, and deletes it. Before creating
 * it says what the link shows and that keys are never included.
 *
 * @example
 * ```tsx
 * <ShareDialog open status="ready" url={url} expiresOn="18 December 2026"
 *   onOpenChange={setOpen} onCreate={create} onDelete={remove} />
 * ```
 */
export function ShareDialog(props: ShareDialogProps) {
  const { status, url, error = 'failed' } = props;
  const { t } = useTranslation();
  const key = 'molecules.shareDialog';
  const [copied, setCopied] = React.useState(false);
  const hasLink = (status === 'ready' || status === 'deleting') && !!url;

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    props.onCopy?.();
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="max-w-md"
        data-testid="share-dialog"
        data-status={status}
        aria-busy={status === 'loading' ? 'true' : undefined}
      >
        <div className="space-y-4">
          <DialogTitle>{t(`${key}.title`)}</DialogTitle>
          {status === 'loading' && (
            <div className="flex items-center gap-2 text-label text-muted-foreground">
              <LoadingSpinner size="sm" />
              {t(`${key}.loading`)}
            </div>
          )}
          {!hasLink && status !== 'loading' && (
            <>
              <DialogDescription>{t(`${key}.description`)}</DialogDescription>
              <ul className={`list-disc space-y-1 pl-5 ${NOTE}`}>
                <li>{t(`${key}.public`)}</li>
                <li>{t(`${key}.expires`)}</li>
                <li>{t(`${key}.noKeys`)}</li>
              </ul>
              {status === 'error' && (
                <p data-testid="share-error" role="alert" className="text-label text-destructive">
                  {t(`${key}.errors.${error}`)}
                </p>
              )}
            </>
          )}
          {hasLink && (
            <>
              <DialogDescription>{t(`${key}.readyDescription`)}</DialogDescription>
              <div className="flex gap-2">
                <label className="sr-only" htmlFor="share-url">
                  {t(`${key}.link`)}
                </label>
                <input
                  id="share-url"
                  data-testid="share-url"
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-muted px-3 font-mono text-caption text-foreground"
                />
                <Button type="button" variant="outline" onClick={copy} data-testid="share-copy">
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? t(`${key}.copied`) : t(`${key}.copy`)}
                </Button>
              </div>
              <p data-testid="share-expiry" className={NOTE}>
                {t(`${key}.expiresOn`, { date: props.expiresOn ?? '' })} {t(`${key}.deleteNote`)}
              </p>
              {props.error && (
                <p data-testid="share-error" role="alert" className="text-label text-destructive">
                  {t(`${key}.errors.${props.error}`)}
                </p>
              )}
            </>
          )}
          <DialogFooter>
            {hasLink ? (
              <Button
                type="button"
                variant="outline"
                onClick={props.onDelete}
                disabled={status === 'deleting'}
                data-testid="share-delete"
                className="text-destructive"
              >
                <Trash2 aria-hidden="true" />
                {t(`${key}.delete`)}
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                {t(`${key}.cancel`)}
              </Button>
            )}
            {hasLink ? (
              <Button type="button" onClick={() => props.onOpenChange(false)} data-testid="share-done">
                {t(`${key}.done`)}
              </Button>
            ) : (
              status !== 'loading' && (
                <Button type="button" onClick={props.onCreate} disabled={status === 'creating'} data-testid="share-create">
                  <Link2 aria-hidden="true" />
                  {status === 'error' ? t(`${key}.retry`) : t(`${key}.create`)}
                </Button>
              )
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
