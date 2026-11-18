import type { ProTransport } from "@ensemble-ai/shared-utils/providers";
import { proRunInput } from "~/lib/proMode";
import { useStore } from "~/store";
import { selectRunModels, selectRunPrompt } from "~/store/slices/responseSlice";
import {
  ProRunSession,
  type ProRunApi,
  type ProRunInput,
} from "./ProRunSession";
import { createProTransport, type ProCallApi } from "./proTransport";
import { createTrpcProApi } from "~/trpc/proClient";

export interface ProRuntime {
  session: ProRunSession;
  transport: ProTransport;
}

/**
 * The run on screen (its prompt and models, and the current consensus
 * settings) as the server prices a follow-up run, or null with no run.
 */
function runOnScreen(): ProRunInput | null {
  const state = useStore.getState();
  const prompt = selectRunPrompt(state);
  const models = selectRunModels(state);
  if (!prompt || models.length === 0) return null;
  return proRunInput({ ...state, selectedModels: models }, prompt);
}

let runtime: ProRuntime | null = null;
let factory: () => ProRunApi & ProCallApi = createTrpcProApi;

/** Set how the runtime reaches the server (the tRPC client in the app, a fake in tests). */
export function setProApiFactory(next: () => ProRunApi & ProCallApi): void {
  factory = next;
  runtime = null;
}

/** The page's one Pro run session and transport, created on first use. */
export function getProRuntime(): ProRuntime {
  if (!runtime) {
    const api = factory();
    const session = new ProRunSession(api, { followUpInput: runOnScreen });
    runtime = { session, transport: createProTransport(api, session) };
  }
  return runtime;
}

/**
 * A transport that creates the runtime on its first call, so registering
 * the Pro clients loads nothing until Pro is used.
 */
export const lazyProTransport: ProTransport = {
  streamText: (...args) => getProRuntime().transport.streamText(...args),
  generateStructured: (...args) =>
    getProRuntime().transport.generateStructured(...args),
  generateEmbeddings: (...args) =>
    getProRuntime().transport.generateEmbeddings(...args),
};
