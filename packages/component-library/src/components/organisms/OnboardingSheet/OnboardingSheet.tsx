import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Cpu, KeyRound, Sparkles } from 'lucide-react';
import { Sheet } from '../../atoms/Sheet';
import { Button } from '../../atoms/Button';
import { OnboardingKeyField, type OnboardingKeyFieldProps } from '../../molecules/OnboardingKeyField';
import { cn } from '../../../lib/utils';

export type OnboardingPath = 'keys' | 'local';

export interface OnboardingLocalProps {
  /** The Ollama offer (OllamaDetectedNotice), when there is one. */
  notice?: React.ReactNode;
  /** A local endpoint that is connected, with its model count. */
  connected?: { name: string; models: number };
  /** Opens settings at the endpoints, for other local servers. */
  onOpenSettings: () => void;
}

export interface OnboardingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path: OnboardingPath;
  onPathChange: (path: OnboardingPath) => void;
  /** The key field for the keys path. */
  keyField: OnboardingKeyFieldProps;
  local: OnboardingLocalProps;
  /** A key works or a local endpoint is connected. */
  canStart: boolean;
  onStart: () => void;
  onSkip: () => void;
}

const OPTIONS = [
  { id: 'keys', Icon: KeyRound },
  { id: 'local', Icon: Cpu },
] as const;

/**
 * OnboardingSheet organism: the one decision before the first question.
 * Own key (checked inline; one is enough), local models (the Ollama offer)
 * or Pro (coming soon until sign-in exists). Start asking is enabled once a
 * key works or a local server is connected; Skip leaves it for later.
 *
 * @example
 * ```tsx
 * <OnboardingSheet open path="keys" onPathChange={setPath} keyField={field}
 *   local={{ onOpenSettings }} canStart={false} onStart={start} onSkip={skip} onOpenChange={setOpen} />
 * ```
 */
export function OnboardingSheet(props: OnboardingSheetProps) {
  const { path, local } = props;
  const { t } = useTranslation();
  const key = 'organisms.onboardingSheet';

  return (
    <Sheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t(`${key}.title`)}
      description={t(`${key}.description`)}
      testId="onboarding-sheet"
      initialFocus="panel"
      className="md:w-[480px]"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={props.onSkip} data-testid="onboarding-skip">
            {t(`${key}.skip`)}
          </Button>
          <Button onClick={props.onStart} disabled={!props.canStart} data-testid="onboarding-start">
            {t(`${key}.start`)} <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <div role="radiogroup" aria-label={t(`${key}.choose`)} className="space-y-2.5">
        {OPTIONS.map(({ id, Icon }) => {
          const on = path === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              data-testid={`onboarding-path-${id}`}
              onClick={() => props.onPathChange(id)}
              className={cn(
                'focus-ring flex w-full gap-3 rounded-xl border p-4 text-left transition-colors duration-fast',
                on ? 'border-primary bg-accent/60' : 'border-border hover:bg-muted',
              )}
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', on ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
              <span>
                <span className="block text-label font-semibold">{t(`${key}.${id}.title`)}</span>
                <span className="block text-caption text-muted-foreground">{t(`${key}.${id}.body`)}</span>
              </span>
            </button>
          );
        })}
        <div data-testid="onboarding-path-pro" aria-disabled="true" className="flex gap-3 rounded-xl border border-dashed border-border p-4 text-muted-foreground">
          <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-label font-semibold">{t(`${key}.pro.title`)}</span>
            <span className="block text-caption">{t(`${key}.pro.body`)}</span>
          </span>
          <span className="self-start rounded-full bg-muted px-2 py-0.5 text-caption">{t(`${key}.pro.soon`)}</span>
        </div>
      </div>

      <div className="mt-6" data-testid={`onboarding-panel-${path}`}>
        {path === 'keys' ? (
          <OnboardingKeyField {...props.keyField} />
        ) : (
          <div className="space-y-3">
            {local.connected ? (
              <p data-testid="onboarding-local-connected" className="flex items-center gap-1.5 rounded-xl bg-success/10 p-4 text-label font-medium text-success">
                <Check className="size-4 shrink-0" aria-hidden="true" />
                {t(`${key}.localConnected`, { name: local.connected.name, count: local.connected.models })}
              </p>
            ) : (
              local.notice ?? (
                <p data-testid="onboarding-local-none" className="rounded-xl bg-muted p-4 text-label text-muted-foreground">
                  {t(`${key}.localNone`)}
                </p>
              )
            )}
            <p className="text-caption text-muted-foreground">
              {t(`${key}.localOther`)}{' '}
              <button
                type="button"
                data-testid="onboarding-local-settings"
                onClick={local.onOpenSettings}
                className="focus-ring rounded font-medium text-primary underline-offset-4 hover:underline"
              >
                {t(`${key}.localSettings`)}
              </button>
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
