import * as React from 'react';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Heading } from '../../atoms/Heading';
import { Info, Trash2 } from 'lucide-react';

export interface Preset {
  id: string;
  name: string;
  description: string;
  modelIds: string[];
  summarizerId: string;
  summarizerName: string;
}

export interface EnsembleManagementPanelProps {
  /** Array of available presets */
  presets: Preset[];
  /** Name of the current ensemble being edited */
  currentEnsembleName: string;
  /** Whether to show delete buttons on presets */
  showDeleteButtons?: boolean;
  /** Callback when a preset is loaded */
  onLoadPreset: (presetId: string) => void;
  /** Callback when a preset is saved */
  onSavePreset: (name: string) => void;
  /** Callback when a preset is deleted */
  onDeletePreset: (presetId: string) => void;
}

/**
 * EnsembleManagementPanel organism for managing ensemble presets.
 *
 * Composes Button and Input atoms to create a panel for saving, loading, and
 * deleting ensemble configurations. Supports quick preset loading and custom
 * ensemble saving.
 *
 * @example
 * ```tsx
 * <EnsembleManagementPanel
 *   presets={savedPresets}
 *   currentEnsembleName="My Ensemble"
 *   onLoadPreset={(id) => loadPreset(id)}
 *   onSavePreset={(name) => saveEnsemble(name)}
 *   onDeletePreset={(id) => deletePreset(id)}
 * />
 * ```
 */
export const EnsembleManagementPanel = React.forwardRef<
  HTMLDivElement,
  EnsembleManagementPanelProps
>(
  (
    {
      presets,
      currentEnsembleName,
      showDeleteButtons = false,
      onLoadPreset,
      onSavePreset,
      onDeletePreset,
    },
    ref
  ) => {
    const [ensembleName, setEnsembleName] = React.useState(currentEnsembleName);

    // Update local state when prop changes
    React.useEffect(() => {
      setEnsembleName(currentEnsembleName);
    }, [currentEnsembleName]);

    const handleSave = () => {
      if (ensembleName.trim()) {
        onSavePreset(ensembleName.trim());
      }
    };

    return (
      <div ref={ref} data-testid="ensemble-management-panel">
        {/* Quick Presets */}
        <div className="mb-6">
          <Heading level={4} size="sm" className="mb-3">Quick presets</Heading>
          <p className="text-xs text-gray-500 mb-4">
            Start from a curated ensemble tuned for common workflows.
          </p>

          {presets.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">
              No saved presets yet. Save your first ensemble below to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {presets.map((preset) => (
                <div key={preset.id} className="border rounded-lg p-3 relative">
                  <div className="flex items-center justify-between mb-2">
                    <Heading level={5} size="sm">{preset.name}</Heading>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent"
                        onClick={() => onLoadPreset(preset.id)}
                      >
                        Use preset
                      </Button>
                      {showDeleteButtons && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onDeletePreset(preset.id)}
                          aria-label={`Delete preset ${preset.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{preset.description}</p>
                  <p className="text-xs text-gray-500">Summarizer: {preset.summarizerName}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Current Ensemble */}
        <div className="mb-6">
          <Heading level={4} size="sm" className="mb-3">Save current ensemble</Heading>
          <p className="text-xs text-gray-500 mb-3">Save this combination for future reviews.</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Ensemble Name</label>
              <Input
                placeholder="e.g. Research Ensemble"
                value={ensembleName}
                onChange={(e) => setEnsembleName(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              variant="outline"
              className="w-full text-sm bg-transparent"
              onClick={handleSave}
            >
              Save Ensemble
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Save your favourite model combinations to load them instantly later.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

EnsembleManagementPanel.displayName = 'EnsembleManagementPanel';
