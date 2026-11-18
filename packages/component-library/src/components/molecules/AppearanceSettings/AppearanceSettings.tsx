import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';

export type AppearanceTheme = 'light' | 'dark';
export type AppearanceLanguage = 'en' | 'fr';

export interface AppearanceSettingsProps {
  theme: AppearanceTheme;
  onThemeChange: (theme: AppearanceTheme) => void;
  language: AppearanceLanguage;
  onLanguageChange: (language: AppearanceLanguage) => void;
  className?: string;
}

/** Language names in their own language, so a reader of either can find theirs. */
const LANGUAGES: Record<AppearanceLanguage, string> = { en: 'English', fr: 'Français' };

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  testIdPrefix: string;
}

/** A row of radio buttons styled as a segmented control. Arrow keys move the choice. */
function Segmented<T extends string>({ label, value, options, onChange, testIdPrefix }: SegmentedProps<T>) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-muted p-1">
      {options.map((option, i) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            data-testid={`${testIdPrefix}-${option.value}`}
            className={cn(
              'focus-ring flex-1 rounded-md py-1.5 text-label transition-colors duration-fast',
              on ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * AppearanceSettings molecule: theme and language for the settings sheet,
 * as two segmented radio groups. Languages are named in their own language.
 *
 * @example
 * ```tsx
 * <AppearanceSettings theme={theme} onThemeChange={setTheme} language={lang} onLanguageChange={setLang} />
 * ```
 */
export function AppearanceSettings({ theme, onThemeChange, language, onLanguageChange, className }: AppearanceSettingsProps) {
  const { t } = useTranslation();
  const key = 'molecules.appearanceSettings';
  return (
    <div data-testid="appearance-settings" className={cn('space-y-3', className)}>
      <div className="space-y-1.5">
        <p className="text-caption text-muted-foreground">{t(`${key}.theme`)}</p>
        <Segmented
          label={t(`${key}.theme`)}
          value={theme}
          onChange={onThemeChange}
          testIdPrefix="theme"
          options={[
            { value: 'light', label: t(`${key}.light`) },
            { value: 'dark', label: t(`${key}.dark`) },
          ]}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-caption text-muted-foreground">{t(`${key}.language`)}</p>
        <Segmented
          label={t(`${key}.language`)}
          value={language}
          onChange={onLanguageChange}
          testIdPrefix="language"
          options={(Object.keys(LANGUAGES) as AppearanceLanguage[]).map((value) => ({ value, label: LANGUAGES[value] }))}
        />
      </div>
    </div>
  );
}
