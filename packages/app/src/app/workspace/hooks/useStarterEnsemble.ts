import { useCallback, useEffect, useState } from "react";
import type { ModelPickerOption } from "@/components/molecules/ModelPicker";
import { useStore } from "~/store";
import { pickStarterModels } from "~/lib/starterEnsemble";

/**
 * Fills the composer with a starting ensemble once, after onboarding ends
 * with Start, so a first-time visitor can ask straight away. `request` arms
 * it; the models are added as soon as the picker offers some (a key's
 * models load after it is checked; in Pro the picker offers the models Pro
 * can bill). It does nothing when a chosen model can already run. Chosen
 * models the picker does not offer (local models when starting Pro) are
 * replaced. It never runs again by itself, so removing every chip later
 * leaves the composer empty.
 */
export function useStarterEnsemble(options: readonly ModelPickerOption[]) {
  const [pending, setPending] = useState(false);
  const addModel = useStore((s) => s.addModel);
  const removeModel = useStore((s) => s.removeModel);
  const selected = useStore((s) => s.selectedModels);

  useEffect(() => {
    if (!pending) return;
    const offered = (model: string) => options.some((o) => o.id === model);
    if (selected.some((m) => offered(m.model))) return setPending(false);
    const ids = pickStarterModels(options);
    if (ids.length === 0) return;
    for (const m of selected) removeModel(m.id);
    for (const id of ids) {
      const option = options.find((o) => o.id === id);
      if (option) addModel(option.provider, option.id);
    }
    setPending(false);
  }, [pending, selected, options, addModel, removeModel]);

  return useCallback(() => setPending(true), []);
}
