/**
 * Routes of the workspace, the app's one working screen. The old wizard
 * pages redirect here with the matching panel open, so links and bookmarks
 * to /config, /ensemble, /prompt and /review keep working.
 */

export const WORKSPACE_PATH = "/workspace";

/** Pages in the app frame (AppShell) rather than the public header and footer. */
const APP_SHELL_PATHS = [WORKSPACE_PATH, "/account"];

/** True for a page that draws its own AppShell: the workspace and /account. */
export function hasAppShell(pathname: string | null): boolean {
  return APP_SHELL_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`) === true,
  );
}

/**
 * Part of the workspace to open from the URL (`?panel=`): the settings
 * sheet, the model picker, or the prompt (focused). No panel shows the
 * workspace with the last run.
 */
export type WorkspacePanel = "settings" | "models" | "prompt";

const PANELS: readonly WorkspacePanel[] = ["settings", "models", "prompt"];

/** Wizard step routes from before the workspace. */
export type LegacyRoute = "config" | "ensemble" | "prompt" | "review";

const LEGACY_TARGETS: Record<LegacyRoute, WorkspacePanel | undefined> = {
  config: "settings",
  ensemble: "models",
  prompt: "prompt",
  review: undefined,
};

/** Panel a wizard route opens in the workspace (none for /review: the last run is shown). */
export function legacyRouteTarget(
  route: LegacyRoute,
): WorkspacePanel | undefined {
  return LEGACY_TARGETS[route];
}

/** The `panel` query value as a known panel, or null. */
export function readWorkspacePanel(
  value: string | null | undefined,
): WorkspacePanel | null {
  return PANELS.find((panel) => panel === value) ?? null;
}

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Workspace URL with `panel` open. Other query parameters are kept, so
 * `/config?mockErrors=...` keeps its mock error scenarios.
 */
export function workspaceHref(
  panel?: WorkspacePanel,
  params: SearchParams = {},
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "panel" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value])
      query.append(key, item);
  }
  if (panel) query.set("panel", panel);
  const text = query.toString();
  return text ? `${WORKSPACE_PATH}?${text}` : WORKSPACE_PATH;
}
