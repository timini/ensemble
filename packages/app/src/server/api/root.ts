import { authRouter } from "~/server/api/routers/auth";
import { providerRouter } from "~/server/api/routers/provider";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  provider: providerRouter,
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
