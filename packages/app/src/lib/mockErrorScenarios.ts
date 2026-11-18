/**
 * Simulated provider errors for mock mode (developer and CI only).
 *
 * Open any page with `?mockErrors=<model>:<kind>[:once],...`, for example
 * `/config?mockErrors=gpt-6-luna:401,gpt-6-astra:timeout:once`. The value is
 * kept in sessionStorage for the tab, so it survives client navigation and
 * reloads. `mockErrors=` (empty) clears it. Kinds: `401`, `403` or
 * `invalid_key`; `429` or `rate_limited`; `500`, `502`, `503` or
 * `provider_unavailable`; `timeout`. The model `*` matches every model.
 * `once` fails only the first call, so a retry succeeds.
 */
import type {
  MockErrorResolver,
  MockErrorScenario,
} from "@ensemble-ai/shared-utils/providers";

export const MOCK_ERRORS_STORAGE_KEY = "ensemble-mock-errors";
const QUERY_PARAM = "mockErrors";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface MockErrorEntry {
  model: string;
  kind: MockErrorScenario;
  once: boolean;
}

const KIND_ALIASES: Record<string, MockErrorScenario> = {
  "401": "invalid_key",
  "403": "invalid_key",
  invalid_key: "invalid_key",
  "429": "rate_limited",
  rate_limited: "rate_limited",
  "500": "provider_unavailable",
  "502": "provider_unavailable",
  "503": "provider_unavailable",
  provider_unavailable: "provider_unavailable",
  timeout: "timeout",
};

/** Parses `model:kind[:once]` entries separated by commas. */
export function parseMockErrorScenarios(value: string): MockErrorEntry[] {
  return value
    .split(",")
    .map((entry) => entry.trim().split(":"))
    .flatMap(([model, kind, flag]) => {
      const resolved = kind ? KIND_ALIASES[kind] : undefined;
      if (!model || !resolved) return [];
      return [{ model, kind: resolved, once: flag === "once" }];
    });
}

function serialize(entries: MockErrorEntry[]): string {
  return entries
    .map((e) => `${e.model}:${e.kind}${e.once ? ":once" : ""}`)
    .join(",");
}

/** Saves the `mockErrors` query parameter, if present, for this tab. */
export function captureMockErrorScenarios(
  search: string,
  storage: StorageLike,
): void {
  const value = new URLSearchParams(search).get(QUERY_PARAM);
  if (value === null) return;
  if (value.trim() === "") storage.removeItem(MOCK_ERRORS_STORAGE_KEY);
  else storage.setItem(MOCK_ERRORS_STORAGE_KEY, value);
}

/**
 * Resolver for MockProviderClient. Reads the stored scenarios on every call
 * and removes a `once` entry when it fires.
 */
export function createMockErrorResolver(
  getStorage: () => StorageLike | null,
): MockErrorResolver {
  return (model) => {
    const storage = getStorage();
    const raw = storage?.getItem(MOCK_ERRORS_STORAGE_KEY);
    if (!storage || !raw) return undefined;

    const entries = parseMockErrorScenarios(raw);
    const match =
      entries.find((e) => e.model === model) ??
      entries.find((e) => e.model === "*");
    if (!match) return undefined;

    if (match.once) {
      const remaining = entries.filter((e) => e !== match);
      if (remaining.length > 0) {
        storage.setItem(MOCK_ERRORS_STORAGE_KEY, serialize(remaining));
      } else {
        storage.removeItem(MOCK_ERRORS_STORAGE_KEY);
      }
    }
    return match.kind;
  };
}
