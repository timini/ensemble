import type { Preset } from "@/components/organisms/EnsembleSidebar";
import { formatModelLabelFromId } from "~/lib/providerModels";
import type { SavedEnsemble } from "~/store";

/** A model the user can pick, with its display name. */
interface NamedModel {
  id: string;
  name: string;
}

/**
 * Saved ensembles as sidebar presets. The description lists the model
 * names; with no summarizer chosen the first model is shown, because that
 * is the model the review page uses.
 */
export function toSidebarPresets(
  savedEnsembles: SavedEnsemble[],
  availableModels: NamedModel[],
): Preset[] {
  const nameOf = (modelId: string) =>
    availableModels.find((m) => m.id === modelId)?.name ??
    formatModelLabelFromId(modelId);

  return savedEnsembles.map((ensemble) => {
    const modelIds = ensemble.models.map((m) => m.model);
    const summarizerId = ensemble.summarizer || (modelIds[0] ?? "");
    return {
      id: ensemble.id,
      name: ensemble.name,
      description: modelIds.map(nameOf).join(", "),
      modelIds,
      summarizerId,
      summarizerName: summarizerId ? nameOf(summarizerId) : "",
    };
  });
}

/** Name of the saved ensemble that is loaded, or an empty string. */
export function savedEnsembleName(
  savedEnsembles: SavedEnsemble[],
  currentEnsembleId: string | null,
): string {
  if (!currentEnsembleId) return "";
  return savedEnsembles.find((e) => e.id === currentEnsembleId)?.name ?? "";
}
