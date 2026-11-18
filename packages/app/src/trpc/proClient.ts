"use client";

import {
  createTRPCClient,
  httpLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client";
import SuperJSON from "superjson";
import { getIdToken } from "~/lib/auth/idToken";
import { getAppCheckToken } from "~/lib/auth/appCheck";
import type { AppRouter } from "~/server/api/root";
import { FetchEventSource } from "~/providers/pro/FetchEventSource";
import type { ProCallApi } from "~/providers/pro/proTransport";
import type { ProRunApi } from "~/providers/pro/ProRunSession";

/** The Bearer ID token and the App Check token, as request headers. */
async function proHeaders(): Promise<Record<string, string>> {
  const [token, appCheck] = await Promise.all([
    getIdToken(),
    getAppCheckToken(),
  ]);
  return {
    "x-trpc-source": "pro-client",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(appCheck ? { "x-firebase-appcheck": appCheck } : {}),
  };
}

/**
 * A plain tRPC client for Pro calls, outside React. Streams go over SSE
 * (httpSubscriptionLink with FetchEventSource, so the tokens travel as
 * headers and a dropped stream is not retried); other calls use httpLink,
 * one request each, so a cancelled call aborts its own request.
 */
function createProTrpcClient() {
  const url = `${window.location.origin}/api/trpc`;
  return createTRPCClient<AppRouter>({
    links: [
      splitLink({
        condition: (op) => op.type === "subscription",
        true: httpSubscriptionLink({
          url,
          transformer: SuperJSON,
          EventSource: FetchEventSource,
          eventSourceOptions: async () => ({ headers: await proHeaders() }),
        }),
        false: httpLink({ url, transformer: SuperJSON, headers: proHeaders }),
      }),
    ],
  });
}

/** The Pro server's run and model calls over tRPC. */
export function createTrpcProApi(): ProRunApi & ProCallApi {
  const client = createProTrpcClient();
  return {
    startRun: (input) => client.proRun.start.mutate(input),
    finishRun: (input) => client.proRun.finish.mutate(input),
    prepareStream: (input, signal) =>
      client.provider.prepareStream.mutate(input, { signal }),
    streamText: (input, handlers) =>
      client.provider.streamTextEvents.subscribe(input, {
        onData: handlers.onData,
        onError: handlers.onError,
        onComplete: handlers.onComplete,
      }),
    generateStructured: (input, signal) =>
      client.provider.generateStructured.mutate(input, { signal }),
    generateEmbeddings: (input, signal) =>
      client.provider.generateEmbeddings.mutate(input, { signal }),
  };
}
