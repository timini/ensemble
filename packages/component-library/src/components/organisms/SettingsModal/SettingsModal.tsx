import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../atoms/Dialog';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Icon } from '../../atoms/Icon';
import { Label } from '../../atoms/Label';
import { Heading } from '../../atoms/Heading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../atoms/Select';
import { FileDown, Upload, Trash2, BookOpen, Database, TriangleAlert } from 'lucide-react';
import { cn } from '../../../lib/utils';

function SectionHeader({ icon, className, children }: { icon: React.ReactNode; className: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={className} size="sm">{icon}</Icon>
      <Heading level={3} size="lg">{children}</Heading>
    </div>
  );
}

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'fr';

export interface SettingsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onExportSettings?: () => void;
  onImportSettings?: () => void;
  onClearData?: () => void;
  onDone?: () => void;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
};

/** SettingsModal organism for managing application settings (theme, language, data). */
export const SettingsModal = React.forwardRef<HTMLDivElement, SettingsModalProps>(
  (
    {
      open,
      onOpenChange,
      theme,
      onThemeChange,
      language,
      onLanguageChange,
      onExportSettings,
      onImportSettings,
      onClearData,
      onDone,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const [showClearConfirm, setShowClearConfirm] = React.useState(false);

    // Reset confirmation state when modal closes
    React.useEffect(() => {
      if (!open) setShowClearConfirm(false);
    }, [open]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent ref={ref} className="max-w-2xl" data-testid="settings-modal">
          <DialogTitle>{t('organisms.settingsModal.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('organisms.settingsModal.description')}
          </DialogDescription>

          {/* Appearance Section */}
          <div className="space-y-6">
            <section data-testid="appearance-section">
              <SectionHeader icon={<BookOpen />} className="text-primary">
                {t('organisms.settingsModal.appearance')}
              </SectionHeader>

              <div className="mb-6">
                <Label className="mb-3 block">{t('organisms.settingsModal.themeLabel')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  {(['light', 'dark'] as const).map((t_) => (
                    <Card
                      key={t_}
                      className={cn(
                        'cursor-pointer border-2 transition-colors hover:border-primary/20',
                        theme === t_ ? 'border-primary bg-primary/10' : 'border-border'
                      )}
                      onClick={() => onThemeChange(t_)}
                      data-testid={`theme-${t_}`}
                    >
                      <div className="p-6 flex flex-col items-center">
                        <div className={cn(
                          'w-16 h-16 rounded mb-3 border',
                          t_ === 'light' ? 'bg-card border-border' : 'bg-foreground border-muted-foreground'
                        )} />
                        <span className={cn('font-medium', theme === t_ && 'text-primary')}>
                          {t(`organisms.settingsModal.theme${t_ === 'light' ? 'Light' : 'Dark'}`)}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <Label htmlFor="language-select" className="mb-3 block">
                  {t('organisms.settingsModal.languageLabel')}
                </Label>
                <Select value={language} onValueChange={(value) => onLanguageChange(value as Language)}>
                  <SelectTrigger
                    className="w-full"
                    data-testid="language-select"
                    id="language-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section data-testid="data-management-section">
              <SectionHeader icon={<Database />} className="text-primary">
                {t('organisms.settingsModal.dataManagement')}
              </SectionHeader>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start" onClick={onExportSettings} data-testid="export-button">
                  <FileDown className="w-4 h-4 mr-2" />{t('organisms.settingsModal.exportSettings')}
                </Button>
                <Button variant="outline" className="justify-start" onClick={onImportSettings} data-testid="import-button">
                  <Upload className="w-4 h-4 mr-2" />{t('organisms.settingsModal.importSettings')}
                </Button>
              </div>
            </section>

            <section data-testid="danger-zone-section">
              <SectionHeader icon={<TriangleAlert />} className="text-destructive">
                {t('organisms.settingsModal.dangerZone')}
              </SectionHeader>
              <p className="text-sm text-muted-foreground mb-4">{t('organisms.settingsModal.dangerZoneWarning')}</p>
              {!showClearConfirm ? (
                <Button
                  variant="outline"
                  className="w-full justify-start border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowClearConfirm(true)}
                  data-testid="clear-data-button"
                >
                  <Trash2 className="w-4 h-4 mr-2" />{t('organisms.settingsModal.clearAllData')}
                </Button>
              ) : (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4" data-testid="clear-data-confirm">
                  <p className="text-sm font-medium text-destructive mb-3">{t('organisms.settingsModal.clearConfirmMessage')}</p>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={() => { onClearData?.(); setShowClearConfirm(false); }} data-testid="clear-data-confirm-button">
                      {t('organisms.settingsModal.clearConfirmYes')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)} data-testid="clear-data-cancel-button">
                      {t('organisms.settingsModal.clearConfirmCancel')}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <DialogFooter className="mt-6">
            <Button
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={onDone}
              data-testid="done-button"
            >
              {t('organisms.settingsModal.doneButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

SettingsModal.displayName = 'SettingsModal';
