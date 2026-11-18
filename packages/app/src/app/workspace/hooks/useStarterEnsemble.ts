import { useCallback, useEffect, useState } from "react";
import type { ModelPickerOption } from "@/components/molecules/ModelPicker";
import { useStore } from "~/store";
import { pickStarterModels } from "~/lib/starterEnsemble";

/**
 * Fills the composer with a starting ensemble once, after onboarding ends
 * with Start, so a first-time visitor can ask straight away. `request` arms
 * it; the models are added as soon as the picker offers some (a key's
 * models load after it is checked). It does nothing when models are
 * already chosen, and it never runs again by itself, so removing every
 * chip later leaves the composer empty.
 */
export function useStarterEnsemble(options: readonly ModelPickerOption[]) {
  const [pending, setPending] = useState(false);
  const addModel = useStore((s) => s.addModel);
  const hasModels = useStore((s) => s.selectedModels.length > 0);

  useEffect(() => {
    if (!pending) return;
    if (hasModels) return setPending(false);
    const ids = pickStarterModels(options);
    if (ids.length === 0) return;
    for (const id of ids) {
      const option = options.find((o) => o.id === id);
      if (option) addModel(option.provider, option.id);
    }
    setPending(false);
  }, [pending, hasModels, options, addModel]);

  return useCallback(() => setPending(true), []);
}
