import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readWorkspacePanel, workspaceHref } from "~/lib/workspaceRoutes";

/**
 * The settings sheet's open state, and the part of the workspace that
 * `?panel=settings|models|prompt` names. Once the store is loaded, settings
 * opens the sheet, models opens the model picker and prompt focuses the
 * prompt. Closing the sheet drops `panel` from the URL (other query
 * parameters stay), so a reload does not open it again.
 *
 * @param hasHydrated - true once the store has loaded from localStorage
 */
export function useWorkspacePanel(hasHydrated: boolean) {
  const router = useRouter();
  const params = useSearchParams();
  const panel = readWorkspacePanel(params.get("panel"));
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!hasHydrated || !panel) return;
    if (panel === "settings") setSettingsOpen(true);
    const target =
      panel === "models"
        ? "model-picker-trigger"
        : panel === "prompt"
          ? "composer-prompt"
          : null;
    const element =
      target &&
      document.querySelector<HTMLElement>(`[data-testid="${target}"]`);
    if (element) {
      element.focus();
      if (panel === "models") element.click();
    }
  }, [hasHydrated, panel]);

  const onSettingsChange = (open: boolean) => {
    setSettingsOpen(open);
    if (!open && panel)
      router.replace(
        workspaceHref(undefined, Object.fromEntries(params.entries())),
      );
  };

  return { settingsOpen, setSettingsOpen, onSettingsChange };
}
