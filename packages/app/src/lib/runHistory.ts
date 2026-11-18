import type { CallUsage } from "@ensemble-ai/shared-utils/pricing";
import type { MajorityVoteRecord } from "~/lib/majorityVote";
import type {
  ConsensusMethod,
  ModelSelection,
} from "~/store/slices/ensembleSlice";
import type {
  AgreementStats,
  ManualResponse,
  ModelResponse,
} from "~/store/slices/responseTypes";

/** Agreement band of a stored run, as the sidebar dot shows it. */
export type StoredAgreementLevel = "high" | "medium" | "low";

/**
 * One finished run kept in this browser (Free mode). It holds everything
 * the workspace needs to show the run again without calling a provider:
 * the answers, embeddings and agreement, the consensus and its usage.
 */
export interface StoredRun {
  /** `run-<createdAt>`, the same id while the run is on screen. */
  id: string;
  /** When the run started, in epoch milliseconds. */
  createdAt: number;
  /**
   * Last time this record was written, in epoch milliseconds. Synced
   * history keeps the newest copy. Missing in runs stored before sync.
   */
  updatedAt?: number;
  prompt: string;
  models: ModelSelection[];
  consensusMethod: ConsensusMethod;
  summarizerModel: string | null;
  responses: ModelResponse[];
  manualResponses: ManualResponse[];
  embeddings: Array<{ modelId: string; embedding: number[] }>;
  embeddingsSource: string | null;
  similarityMatrix: number[][] | null;
  agreementStats: AgreementStats | null;
  metaAnalysis: string | null;
  majorityVote: MajorityVoteRecord | null;
  consensusUsage: CallUsage[];
  /** Overall agreement (0 to 1), or null when it was not scored. */
  agreementScore: number | null;
  agreementLevel: StoredAgreementLevel | null;
  /** Total cost in US dollars, or null when it is not known. */
  costUsd: number | null;
}

/** Runs kept at most; saving one more drops the oldest. */
export const HISTORY_LIMIT = 200;

const DB_NAME = "ensemble-ai-history";
const STORE = "runs";

/** True when this browser lets the page use IndexedDB. */
export function historyAvailable(): boolean {
  return typeof globalThis.indexedDB !== "undefined" && !!globalThis.indexedDB;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("createdAt", "createdAt");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB"));
  });
}

/**
 * Runs `work` in one transaction and resolves with its result when the
 * transaction completes. Resolves with `fallback` when IndexedDB is missing.
 */
async function withStore<T>(
  mode: IDBTransactionMode,
  fallback: T,
  work: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  if (!historyAvailable()) return fallback;
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request ? request.result : fallback);
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB"));
    });
  } finally {
    db.close();
  }
}

/** Every stored run, newest first. */
export async function listRuns(): Promise<StoredRun[]> {
  const runs = await withStore<StoredRun[]>(
    "readonly",
    [],
    (store) => store.getAll() as IDBRequest<StoredRun[]>,
  );
  return [...runs].sort((a, b) => b.createdAt - a.createdAt);
}

/** One stored run, or undefined. */
export function getRun(id: string): Promise<StoredRun | undefined> {
  return withStore<StoredRun | undefined>(
    "readonly",
    undefined,
    (store) => store.get(id) as IDBRequest<StoredRun | undefined>,
  );
}

/** Saves a run, replacing one with the same id, and drops the oldest past the limit. */
export async function saveRun(run: StoredRun): Promise<void> {
  await withStore<undefined>("readwrite", undefined, (store) => {
    store.put(run);
    const keys = store.index("createdAt").getAllKeys();
    keys.onsuccess = () => {
      const extra = keys.result.length - HISTORY_LIMIT;
      // Keys come oldest first from the createdAt index.
      keys.result
        .slice(0, Math.max(0, extra))
        .forEach((key) => store.delete(key));
    };
  });
}

/** Deletes one stored run. */
export async function deleteRun(id: string): Promise<void> {
  await withStore<undefined>("readwrite", undefined, (store) => {
    store.delete(id);
  });
}

/** Deletes every stored run (Clear data in settings). */
export async function clearRuns(): Promise<void> {
  await withStore<undefined>("readwrite", undefined, (store) => {
    store.clear();
  });
}
