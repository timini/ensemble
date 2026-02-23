import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import * as Sentry from "@sentry/nextjs";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export const runtime = "nodejs";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const captureHandledTrpcErrors =
  process.env.SENTRY_CAPTURE_HANDLED_TRPC_ERRORS !== "false";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error }) => {
      const safePath = path ?? "<no-path>";

      if (env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${safePath}: ${error.message}`,
        );
      }

      const context = {
        extra: { path: safePath, code: error.code },
        tags: { trpcCode: error.code, trpcPath: safePath },
      };

      if (error.code === "INTERNAL_SERVER_ERROR" || captureHandledTrpcErrors) {
        Sentry.captureException(error, context);
        return;
      }

      Sentry.captureMessage(`Handled tRPC error on ${safePath}: ${error.code}`, {
        ...context,
        level: "warning",
        fingerprint: ["trpc-handled", error.code, safePath],
      });
    },
  });

export { handler as GET, handler as POST };
