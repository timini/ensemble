/**
 * Shapes and limits shared by the client and the server for synced history
 * and presets. An item travels as JSON text (`payload`) so nested arrays
 * (a run's similarity matrix) fit in Firestore, which cannot store arrays
 * of arrays.
 */

export type SyncKind = "history" | "presets";

/** One stored item, as sent to and read from the server. */
export interface SyncItem {
  id: string;
  /** Last change on the device that wrote it, in epoch milliseconds. */
  updatedAt: number;
  /** The item as JSON. */
  payload: string;
}

/** An item deleted on some device, kept so other devices drop it too. */
export interface SyncTombstone {
  id: string;
  deletedAt: number;
}

export interface SyncSnapshot {
  items: SyncItem[];
  deleted: SyncTombstone[];
}

/** Item ids: letters, digits, `-` and `_`, no `__` (the server's key separator). */
export const SYNC_ID = /^(?!.*__)[A-Za-z0-9_-]{1,128}$/;

/** Per kind: largest item as JSON, and most items per upload call. */
export const SYNC_LIMITS: Record<
  SyncKind,
  { maxPayload: number; maxBatch: number }
> = {
  // Firestore documents hold 1 MiB; a run with six embeddings fits well below this.
  history: { maxPayload: 800_000, maxBatch: 5 },
  presets: { maxPayload: 20_000, maxBatch: 50 },
};

/** Most items (and tombstones) a device reads back per kind. */
export const SYNC_LIST_LIMIT = 500;

/**
 * Field names that hold secrets. Nothing synced should carry one (runs and
 * presets have no keys), but they are stripped on the client and refused by
 * the server so a later change cannot leak one by accident.
 */
const SECRET_FIELD =
  /^(api[-_]?key|apikeys?|keys|key|secret|secrets|password|authorization|access[-_]?token|id[-_]?token|refresh[-_]?token|encrypted[-_]?key|encryptedKeys?)$/i;

/** True when `name` looks like a field that holds a secret. */
export function isSecretField(name: string): boolean {
  return SECRET_FIELD.test(name);
}

/** A deep copy of `value` without any secret-looking field. */
export function stripSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripSecrets) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (!isSecretField(k)) out[k] = stripSecrets(v);
    }
    return out as T;
  }
  return value;
}

/** Path of the first secret-looking field in `value`, or null. */
export function findSecretField(value: unknown, path = ""): string | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findSecretField(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const here = path ? `${path}.${k}` : k;
      if (isSecretField(k)) return here;
      const hit = findSecretField(v, here);
      if (hit) return hit;
    }
  }
  return null;
}
