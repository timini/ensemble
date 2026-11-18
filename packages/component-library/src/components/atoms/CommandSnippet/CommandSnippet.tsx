import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandSnippetProps {
  /** The shell command, shown as is (commands are not translated). */
  command: string;
  /** Prefix for the test ids of the code (`-command`) and the copy button (`-copy`). */
  'data-testid'?: string;
  className?: string;
}

/**
 * CommandSnippet atom: one shell command in monospace with a copy button,
 * for setup steps such as `ollama pull nomic-embed-text`.
 *
 * @example
 * ```tsx
 * <CommandSnippet command="npm run local" data-testid="local-run" />
 * ```
 */
export function CommandSnippet({ command, className, 'data-testid': testId = 'command-snippet' }: CommandSnippetProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    void navigator.clipboard
      ?.writeText(command)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <div
      className={cn('flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2 font-mono text-caption', className)}
      data-testid={testId}
    >
      <code className="flex-1 break-all font-mono text-xs text-foreground" data-testid={`${testId}-command`}>
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={t('atoms.commandSnippet.copyLabel')}
        data-testid={`${testId}-copy`}
        className="inline-flex shrink-0 items-center gap-1 rounded px-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
        {t(copied ? 'atoms.commandSnippet.copied' : 'atoms.commandSnippet.copy')}
      </button>
    </div>
  );
}
