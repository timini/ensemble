import {
  EmbeddingsNotSupportedError,
  ProviderError,
  cancelledError,
  type ProStreamRequest,
  type ProStreamResult,
  type ProStructuredRequest,
  type ProTransport,
  type ProviderName,
  type StructuredResponse,
} from "@ensemble-ai/shared-utils/providers";
import { toProError } from "./proErrors";
import type { ProRunSession } from "./ProRunSession";

interface CallIds {
  runId: string;
  callId: string;
}

/** Providers Pro can call. OpenAI-compatible endpoints are configured in the browser, so they stay in Free mode. */
export type ProProvider = Exclude<ProviderName, "openai-compatible">;

type ForPro<T extends { provider: ProviderName }> = Omit<T, "provider"> & {
  provider: ProProvider;
};

function proProvider(provider: ProviderName): ProProvider {
  if (provider === "openai-compatible") {
    throw new ProviderError(
      "Pro mode does not run models from your own endpoints. Switch to Free mode to use them.",
      "other",
      { provider },
    );
  }
  return provider;
}

export type ProStreamEvent =
  | { type: "chunk"; chunk: string }
  | ({ type: "complete" } & ProStreamResult);

/** The Pro server's three model calls (tRPC in the app, fakes in tests). */
export interface ProCallApi {
  /** Admit a stream and send its prompt (a POST body). */
  prepareStream(
    input: ForPro<ProStreamRequest> & CallIds,
    signal?: AbortSignal,
  ): Promise<unknown>;
  /** Stream a prepared call over SSE; only the ids go in the URL. */
  streamText(
    input: CallIds,
    handlers: {
      onData: (event: ProStreamEvent) => void;
      onError: (error: unknown) => void;
      onComplete: () => void;
    },
  ): { unsubscribe: () => void };
  generateStructured(
    input: ForPro<ProStructuredRequest> & CallIds,
    signal?: AbortSignal,
  ): Promise<StructuredResponse<unknown>>;
  generateEmbeddings(
    input: { provider: "openai" | "google"; text: string } & CallIds,
    signal?: AbortSignal,
  ): Promise<number[]>;
}

/**
 * ProTransport over the Pro server: every call runs inside the session's
 * current run with a fresh call id. A stream is prepared first (the prompt
 * goes in a POST body), then subscribed to by its ids over SSE. Aborting a
 * stream unsubscribes, which closes the SSE request, and the server aborts
 * its OpenRouter call.
 */
export function createProTransport(
  api: ProCallApi,
  session: ProRunSession,
  newId: () => string = () => crypto.randomUUID(),
): ProTransport {
  return {
    streamText: async (request, onChunk, signal) => {
      const provider = proProvider(request.provider);
      return session.track(async (runId) => {
        const callId = newId();
        if (signal?.aborted) throw cancelledError(provider);
        try {
          await api.prepareStream(
            { ...request, provider, runId, callId },
            signal,
          );
        } catch (error) {
          throw toProError(error, provider);
        }
        return new Promise<ProStreamResult>((resolve, reject) => {
          if (signal?.aborted) {
            reject(cancelledError(request.provider));
            return;
          }
          let done = false;
          const sub = api.streamText(
            { runId, callId },
            {
              onData: (event) => {
                if (done) return;
                if (event.type === "chunk") {
                  onChunk(event.chunk);
                  return;
                }
                done = true;
                resolve({
                  response: event.response,
                  responseTimeMs: event.responseTimeMs,
                  ...(event.usage ? { usage: event.usage } : {}),
                });
              },
              onError: (error) => {
                if (done) return;
                done = true;
                reject(toProError(error, request.provider));
              },
              onComplete: () => {
                if (done) return;
                done = true;
                reject(
                  new ProviderError(
                    "The answer stream ended early.",
                    "provider_unavailable",
                    {
                      provider: request.provider,
                    },
                  ),
                );
              },
            },
          );
          signal?.addEventListener(
            "abort",
            () => {
              if (done) return;
              done = true;
              sub.unsubscribe();
              reject(cancelledError(request.provider));
            },
            { once: true },
          );
        });
      });
    },

    generateStructured: async (request, signal) => {
      const provider = proProvider(request.provider);
      return session.track(async (runId) => {
        try {
          return await api.generateStructured(
            { ...request, provider, runId, callId: newId() },
            signal,
          );
        } catch (error) {
          throw toProError(error, request.provider);
        }
      });
    },

    generateEmbeddings: async (request, signal) => {
      const { provider, text } = request;
      if (provider !== "openai" && provider !== "google") {
        throw new EmbeddingsNotSupportedError(provider);
      }
      return session.track(async (runId) => {
        try {
          return await api.generateEmbeddings(
            { provider, text, runId, callId: newId() },
            signal,
          );
        } catch (error) {
          throw toProError(error, provider);
        }
      });
    },
  };
}
