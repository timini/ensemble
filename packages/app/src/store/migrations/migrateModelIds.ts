/**
 * Migration: Model Display Names → Model IDs
 *
 * Before this fix, `ModelSelection.model` stored display names
 * (e.g., "Gemini 1.5 Pro") instead of API identifiers (e.g., "gemini-1.5-pro").
 * This migration converts any persisted display names to their correct model IDs.
 */

import { FALLBACK_MODELS } from '~/lib/models';

/** Display names contain spaces or start with an uppercase letter — model IDs don't. */
function looksLikeDisplayName(value: string): boolean {
  return /\s/.test(value) || /^[A-Z]/.test(value);
}

interface PersistedModelSelection {
  id: string;
  provider: string;
  model: string;
}

function migrateSelections(
  selections: PersistedModelSelection[],
): PersistedModelSelection[] {
  return selections.map((selection) => {
    if (!selection.model || !looksLikeDisplayName(selection.model)) {
      return selection;
    }
    const matched = FALLBACK_MODELS.find(
      (m) => m.name === selection.model && m.provider === selection.provider,
    );
    return matched ? { ...selection, model: matched.id } : selection;
  });
}

/**
 * Deserialize hook for the persistence middleware.
 * Migrates any `selectedModels[].model` values that look like display names
 * to their corresponding API IDs using FALLBACK_MODELS.
 */
export function migrateModelDisplayNamesToIds<T extends Record<string, unknown>>(
  storedState: Partial<T>,
): Partial<T> {
  // Work on a plain object copy to avoid TS indexing issues with Partial<T>
  const state: Record<string, unknown> = { ...storedState };

  // Migrate selectedModels
  if (Array.isArray(state.selectedModels)) {
    state.selectedModels = migrateSelections(
      state.selectedModels as PersistedModelSelection[],
    );
  }

  // Migrate savedEnsembles[].models
  if (Array.isArray(state.savedEnsembles)) {
    state.savedEnsembles = (
      state.savedEnsembles as Array<Record<string, unknown>>
    ).map((ensemble) => {
      const models = ensemble.models;
      if (!Array.isArray(models)) return ensemble;
      return {
        ...ensemble,
        models: migrateSelections(models as PersistedModelSelection[]),
      };
    });
  }

  return state as Partial<T>;
}
