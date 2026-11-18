// Workspace wireframe state lives in the URL so every state has a link.

export type WorkspaceState = "new" | "ready" | "running" | "done"
export type SheetName = "onboarding" | "settings" | "manual" | "history" | "share"
export type ShareState = "create" | "ready" | "error" | "limit"
export type MenuName = "method" | "options" | "models"

export interface WorkspaceParams {
  state: WorkspaceState
  sheet?: SheetName
  menu?: MenuName
  path?: "keys" | "local"
  tab?: string
  theme?: string
  /** Share dialog state when `sheet=share`. Defaults to `ready`. */
  share?: ShareState
  /** `1` when signed in, so history syncs to the account. Signed out otherwise. */
  signedIn?: "1"
}

type Raw = Record<string, string | string[] | undefined>

const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined

/** Reads the workspace params. A first visit (`state=new`) opens onboarding unless another sheet is asked for. */
export function readParams(raw: Raw): WorkspaceParams {
  const state = pick(raw.state, ["new", "ready", "running", "done"] as const) ?? "done"
  const sheet = pick(raw.sheet, ["onboarding", "settings", "manual", "history", "share"] as const)
  return {
    state,
    sheet: sheet ?? (state === "new" && raw.sheet !== "none" ? "onboarding" : undefined),
    menu: pick(raw.menu, ["method", "options", "models"] as const),
    path: pick(raw.path, ["keys", "local"] as const),
    tab: typeof raw.tab === "string" ? raw.tab : undefined,
    theme: pick(raw.theme, ["light", "dark"] as const),
    share: pick(raw.share, ["create", "ready", "error", "limit"] as const),
    signedIn: pick(raw.signedIn, ["1"] as const),
  }
}

/** Builds a workspace link from the current params plus changes. Undefined removes a key. */
export function href(current: WorkspaceParams, change: Partial<Record<keyof WorkspaceParams, string | undefined>>): string {
  const next: Record<string, string | undefined> = { ...current, menu: undefined, ...change }
  if (next.state === "new" && !next.sheet) next.sheet = "none"
  if (next.state === "done") delete next.state
  const query = Object.entries(next)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&")
  return query ? `/workspace?${query}` : "/workspace"
}
