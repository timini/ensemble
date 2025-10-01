import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function EnsembleHeader() {
  const { t } = useTranslation();

  return (
    <div className="bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('ensemble.header.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('ensemble.header.tagline')}
            </p>
          </div>
          <Settings className="w-5 h-5 text-muted-foreground" role="img" />
        </div>
      </div>
    </div>
  );
}
