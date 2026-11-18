import { authRouter } from "~/server/api/routers/auth";
import { creditsRouter } from "~/server/api/routers/credits";
import { providerRouter } from "~/server/api/routers/provider";
import { proRunRouter } from "~/server/api/routers/proRun";
import { shareRouter } from "~/server/api/routers/share";
import { syncRouter } from "~/server/api/routers/sync";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  credits: creditsRouter,
  provider: providerRouter,
  proRun: proRunRouter,
  share: shareRouter,
  sync: syncRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const me = await trpc.auth.me();
 */
export const createCaller = createCallerFactory(appRouter);
