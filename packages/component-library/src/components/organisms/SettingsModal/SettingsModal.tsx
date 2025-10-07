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

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'fr';

export interface SettingsModalProps {
  /** Whether the modal is open */
  open?: boolean;
  /** Callback when modal open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Current theme */
  theme: Theme;
  /** Callback when theme changes */
  onThemeChange: (theme: Theme) => void;
  /** Current language */
  language: Language;
  /** Callback when language changes */
  onLanguageChange: (language: Language) => void;
  /** Callback when export settings is clicked */
  onExportSettings?: () => void;
  /** Callback when import settings is clicked */
  onImportSettings?: () => void;
  /** Callback when clear all data is clicked */
  onClearData?: () => void;
  /** Callback when done button is clicked */
  onDone?: () => void;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
};

/**
 * SettingsModal organism for managing application settings.
 *
 * Provides interface for changing theme, language, managing data, and clearing settings.
 * Uses Dialog component with organized sections for different settings categories.
 *
 * @example
 * ```tsx
 * <SettingsModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   theme="light"
 *   onThemeChange={setTheme}
 *   language="en"
 *   onLanguageChange={setLanguage}
 *   onExportSettings={() => console.log('Export')}
 *   onImportSettings={() => console.log('Import')}
 *   onClearData={() => console.log('Clear')}
 *   onDone={() => setIsOpen(false)}
 * />
 * ```
 */
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
              <div className="flex items-center gap-2 mb-4">
                <Icon className="text-blue-600" size="sm">
                  <BookOpen />
                </Icon>
                <Heading level={3} size="lg">
                  {t('organisms.settingsModal.appearance')}
                </Heading>
              </div>

              {/* Theme */}
              <div className="mb-6">
                <Label className="mb-3 block">{t('organisms.settingsModal.themeLabel')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={cn(
                      'cursor-pointer border-2 transition-colors hover:border-blue-200',
                      theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    )}
                    onClick={() => onThemeChange('light')}
                    data-testid="theme-light"
                  >
                    <div className="p-6 flex flex-col items-center">
                      <div className="w-16 h-16 bg-white border border-gray-300 rounded mb-3" />
                      <span className={cn('font-medium', theme === 'light' && 'text-blue-600')}>
                        {t('organisms.settingsModal.themeLight')}
                      </span>
                    </div>
                  </Card>
                  <Card
                    className={cn(
                      'cursor-pointer border-2 transition-colors hover:border-blue-200',
                      theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    )}
                    onClick={() => onThemeChange('dark')}
                    data-testid="theme-dark"
                  >
                    <div className="p-6 flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-800 border border-gray-600 rounded mb-3" />
                      <span className={cn('font-medium', theme === 'dark' && 'text-blue-600')}>
                        {t('organisms.settingsModal.themeDark')}
                      </span>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Language */}
              <div>
                <Label htmlFor="language-select" className="mb-3 block">
                  {t('organisms.settingsModal.languageLabel')}
                </Label>
                <Select value={language} onValueChange={(value) => onLanguageChange(value as Language)}>
                  <SelectTrigger className="w-full" data-testid="language-select">
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

            {/* Data Management Section */}
            <section data-testid="data-management-section">
              <div className="flex items-center gap-2 mb-4">
                <Icon className="text-blue-600" size="sm">
                  <Database />
                </Icon>
                <Heading level={3} size="lg">
                  {t('organisms.settingsModal.dataManagement')}
                </Heading>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={onExportSettings}
                  data-testid="export-button"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {t('organisms.settingsModal.exportSettings')}
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={onImportSettings}
                  data-testid="import-button"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t('organisms.settingsModal.importSettings')}
                </Button>
              </div>
            </section>

            {/* Danger Zone Section */}
            <section data-testid="danger-zone-section">
              <div className="flex items-center gap-2 mb-4">
                <Icon className="text-red-600" size="sm">
                  <TriangleAlert />
                </Icon>
                <Heading level={3} size="lg">
                  {t('organisms.settingsModal.dangerZone')}
                </Heading>
              </div>

              <p className="text-sm text-gray-600 mb-4">{t('organisms.settingsModal.dangerZoneWarning')}</p>

              <Button
                variant="outline"
                className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={onClearData}
                data-testid="clear-data-button"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('organisms.settingsModal.clearAllData')}
              </Button>
            </section>
          </div>

          <DialogFooter className="mt-6">
            <Button
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
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
