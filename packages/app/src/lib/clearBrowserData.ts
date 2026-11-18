import { useStore } from "~/store";
import { clearRuns } from "~/lib/runHistory";

const STORE_KEY = "ensemble-ai-store";

/** Clears everything this browser keeps (store and run history) and reloads the workspace. */
export async function clearBrowserData(): Promise<void> {
  await clearRuns().catch(() => undefined);
  // Reset the store first: it persists every change, so it would
  // otherwise write the old state back before the page reloads.
  useStore.setState(useStore.getInitialState(), true);
  localStorage.removeItem(STORE_KEY);
  window.location.assign("/workspace");
}
