import { parseEndpointModelId } from "@ensemble-ai/shared-utils/providers";
import type {
  Provider,
  ValidationStatus,
} from "@/components/molecules/ApiKeyInput";
import type { Model } from "@/components/organisms/ModelSelectionList";
import type { ComposerModel } from "@/components/organisms/Composer";
import type { ModelPickerOption } from "@/components/molecules/ModelPicker";
import { PROVIDER_NAMES } from "@/components/molecules/ResponseCard";
import type { ModelSelection } from "~/store";
import { endpointModelName, type EndpointLabel } from "./endpointModels";
import { formatModelLabelFromId } from "./providerModels";

/**
 * Models the composer's picker offers: those of providers with a working
 * key, grouped by provider, and those of connected endpoints, grouped by
 * endpoint and named by their id on the server.
 */
export function toPickerOptions(
  models: readonly Model[],
  statuses: Record<Provider, ValidationStatus>,
  connectedEndpoints: readonly EndpointLabel[],
): ModelPickerOption[] {
  return models.flatMap((model): ModelPickerOption[] => {
    if (model.provider === "openai-compatible") {
      const parsed = parseEndpointModelId(model.id);
      const endpoint = connectedEndpoints.find(
        (e) => e.id === parsed?.endpointId,
      );
      if (!parsed || !endpoint) return [];
      return [
        {
          id: model.id,
          name: parsed.modelId,
          provider: model.provider,
          group: endpoint.label,
        },
      ];
    }
    if (statuses[model.provider] !== "valid") return [];
    return [
      {
        id: model.id,
        name: model.name,
        provider: model.provider,
        group: PROVIDER_NAMES[model.provider],
      },
    ];
  });
}

/** The selected models as composer chips, keyed by model id. */
export function toComposerModels(
  selected: readonly ModelSelection[],
  models: readonly Model[],
  endpoints: readonly EndpointLabel[],
): ComposerModel[] {
  return selected.map((s) => ({
    id: s.model,
    name:
      s.provider === "openai-compatible"
        ? endpointModelName(s.model, endpoints)
        : (models.find((m) => m.id === s.model)?.name ??
          formatModelLabelFromId(s.model)),
    provider: s.provider,
  }));
}
