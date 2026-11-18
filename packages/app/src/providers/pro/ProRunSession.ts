import { ProviderError } from "@ensemble-ai/shared-utils/providers";
import type { EstimateRunInput } from "@ensemble-ai/shared-utils/pricing";
import { toProError } from "./proErrors";

/** What a Pro run will do, as the server prices it (no endpoints in Pro). */
export type ProRunInput = Omit<EstimateRunInput, "endpoints" | "table">;

export type FinishReason = "done" | "cancelled" | "failed";

/** The two run calls of the Pro server (proRun.start and proRun.finish). */
export interface ProRunApi {
  startRun(input: ProRunInput & { runId: string }): Promise<unknown>;
  finishRun(input: { runId: string; reason: FinishReason }): Promise<unknown>;
}

interface OpenRun {
  runId: string;
  started: Promise<void>;
  inFlight: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
}

export interface ProRunSessionOptions {
  /** A run with no call in flight for this long is finished. Default 10 s. */
  idleMs?: number;
  newId?: () => string;
}

/**
 * The client side of a Pro run's billing. `begin` finishes the previous run
 * and reserves credits for the next one; every Pro call goes through
 * `track`, which waits for the reservation and passes the run id. Once no
 * call has been in flight for `idleMs` (answers, embeddings and consensus
 * are all done) the run is finished, so the server settles it. A call made
 * later (a retry, a consensus after a manual answer) opens a follow-up run
 * priced like the last one. `cancel` finishes the run at once.
 */
export class ProRunSession {
  private current: OpenRun | null = null;
  private lastInput: ProRunInput | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly idleMs: number;
  private readonly newId: () => string;

  constructor(
    private readonly api: ProRunApi,
    options: ProRunSessionOptions = {},
  ) {
    this.idleMs = options.idleMs ?? 10_000;
    this.newId = options.newId ?? (() => crypto.randomUUID());
  }

  /** Start a run. Rejects with a ProviderError (`insufficient_credits`, `rate_limited`...) when it cannot. */
  begin(input: ProRunInput): Promise<void> {
    void this.finish("done");
    this.lastInput = input;
    const run = this.open(input);
    this.current = run;
    return run.started;
  }

  /** Run `call` inside the current run, opening a follow-up run when none is open. */
  async track<T>(call: (runId: string) => Promise<T>): Promise<T> {
    let run = this.current;
    if (!run) {
      if (!this.lastInput)
        throw new ProviderError("No Pro run is open.", "other");
      run = this.open(this.lastInput);
      this.current = run;
    }
    run.inFlight += 1;
    if (run.idleTimer) clearTimeout(run.idleTimer);
    run.idleTimer = null;
    try {
      await run.started;
      return await call(run.runId);
    } finally {
      run.inFlight -= 1;
      if (run.inFlight === 0 && this.current === run) {
        run.idleTimer = setTimeout(() => void this.finish("done"), this.idleMs);
      }
    }
  }

  /** Finish the current run now (the server settles it). Never rejects. */
  async finish(reason: FinishReason): Promise<void> {
    const run = this.current;
    if (!run) return;
    this.current = null;
    if (run.idleTimer) clearTimeout(run.idleTimer);
    try {
      await run.started;
    } catch {
      return; // Nothing was reserved.
    }
    try {
      await this.api.finishRun({ runId: run.runId, reason });
    } catch {
      // The server settles abandoned runs when the user starts the next one.
    }
    this.notify();
  }

  /** Stop billing the current run: it settles for what it used. */
  cancel(): Promise<void> {
    return this.finish("cancelled");
  }

  /** Called after each reservation and settlement, to refresh the balance. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private open(input: ProRunInput): OpenRun {
    const runId = this.newId();
    const run: OpenRun = {
      runId,
      inFlight: 0,
      idleTimer: null,
      started: Promise.resolve(),
    };
    run.started = this.api.startRun({ ...input, runId }).then(
      () => this.notify(),
      (error: unknown) => {
        if (this.current === run) this.current = null;
        throw toProError(error);
      },
    );
    // Callers that never await the start still see its failure through track.
    run.started.catch(() => undefined);
    return run;
  }
}
