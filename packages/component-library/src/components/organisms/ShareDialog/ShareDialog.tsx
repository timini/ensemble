import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../atoms/Dialog';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { LoadingSpinner } from '../../atoms/LoadingSpinner';
import { Copy, Check, ExternalLink } from 'lucide-react';

export interface ShareDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The generated share URL (null while loading or on error) */
  shareUrl: string | null;
  /** Whether the share link is being created */
  isLoading: boolean;
  /** Error message if share creation failed */
  error: string | null;
  /** Callback when copy link button is clicked */
  onCopyLink: () => void;
}

/**
 * ShareDialog organism for sharing review results.
 *
 * Displays a dialog with the generated share link, a copy button,
 * and an open-in-new-tab link. Handles loading and error states.
 *
 * @example
 * ```tsx
 * <ShareDialog
 *   open={true}
 *   onOpenChange={setOpen}
 *   shareUrl="https://example.com/share/abc123"
 *   isLoading={false}
 *   error={null}
 *   onCopyLink={() => navigator.clipboard.writeText(url)}
 * />
 * ```
 */
export function ShareDialog({
  open,
  onOpenChange,
  shareUrl,
  isLoading,
  error,
  onCopyLink,
}: ShareDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Reset copied state when dialog closes
  React.useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="share-dialog">
        <DialogHeader>
          <DialogTitle>
            {t('organisms.shareDialog.title', 'Share Results')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'organisms.shareDialog.description',
              'Share your ensemble review with others using this link.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isLoading && (
            <div
              className="flex items-center justify-center py-6"
              data-testid="share-loading"
            >
              <LoadingSpinner size="lg" />
              <span className="ml-2 text-sm text-muted-foreground">
                {t('organisms.shareDialog.generating', 'Generating share link...')}
              </span>
            </div>
          )}

          {error && (
            <div
              className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
              data-testid="share-error"
            >
              {error}
            </div>
          )}

          {shareUrl && !isLoading && (
            <>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="flex-1 font-mono text-sm"
                  data-testid="share-url-input"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  data-testid="copy-link-button"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {copied && (
                <p
                  className="text-sm text-green-600"
                  data-testid="copied-confirmation"
                >
                  {t('organisms.shareDialog.copied', 'Link copied to clipboard!')}
                </p>
              )}

              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                data-testid="open-share-link"
              >
                <ExternalLink className="h-3 w-3" />
                {t('organisms.shareDialog.openLink', 'Open in new tab')}
              </a>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
