import { z } from "zod";
import { createTRPCRouter, proProcedure } from "~/server/api/trpc";
import { runQuoteInput } from "~/server/api/routers/credits";
import { getProDeps } from "~/server/pro";
import { toProTRPCError } from "~/server/pro/errors";
import { closeProRun, startProRun } from "~/server/pro/proRunService";

const runId = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/)
  .refine((v) => !v.includes("__"));

/**
 * The life of a Pro run. `start` reserves credits for the run the client
 * describes (priced on the server with estimateRun, so the client cannot
 * pick the amount); model calls then name the run; `finish` settles it for
 * the usage recorded, or refunds it when nothing was used. A cancelled run
 * is finished the same way, so it pays only for what it used.
 */
export const proRunRouter = createTRPCRouter({
  start: proProcedure
    .input(runQuoteInput.extend({ runId }))
    .mutation(async ({ ctx, input }) => {
      const { runId: id, ...run } = input;
      try {
        return await startProRun(getProDeps(), ctx.authUser.uid, {
          runId: id,
          run,
        });
      } catch (error) {
        throw toProTRPCError(error);
      }
    }),

  finish: proProcedure
    .input(z.object({ runId, reason: z.enum(["done", "cancelled", "failed"]) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await closeProRun(getProDeps(), ctx.authUser.uid, input.runId, {
          reason: input.reason,
        });
      } catch (error) {
        throw toProTRPCError(error);
      }
    }),
});
