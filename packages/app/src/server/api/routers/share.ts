import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sharedRunSchema } from "~/lib/share/sharedRun";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getAdminFirestore } from "~/server/firebase/firestore";
import { RateLimitError } from "~/server/pro/rateLimit";
import {
  createShare,
  deleteShare,
  DEFAULT_SHARE_RATE,
  findShareForRun,
  ShareNotFoundError,
  ShareTooLargeError,
} from "~/server/share/shareStore";

/** A history run id (`run-<epoch ms>`) or any short safe id. */
const runId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

const shareId = z
  .string()
  .length(22)
  .regex(/^[A-Za-z0-9_-]+$/);

/** Shares one user may create per hour, from SHARE_RATE_LIMIT_PER_HOUR. */
export function shareRate() {
  const raw = Number(process.env.SHARE_RATE_LIMIT_PER_HOUR);
  return Number.isInteger(raw) && raw > 0
    ? { limit: raw, windowSeconds: 3600 }
    : DEFAULT_SHARE_RATE;
}

function toTRPCError(error: unknown): unknown {
  if (error instanceof RateLimitError)
    return new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: error.message,
      cause: error,
    });
  if (error instanceof ShareTooLargeError)
    return new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: error.message });
  if (error instanceof ShareNotFoundError)
    return new TRPCError({ code: "NOT_FOUND", message: error.message });
  return error;
}

/**
 * Share links (FR-042 to FR-044). Creating and deleting need a signed-in
 * user in either mode. The public page reads shares on the server
 * (`app/s/[id]`), not through this router.
 */
export const shareRouter = createTRPCRouter({
  /** Share a finished run; one link per run, valid for 30 days. */
  create: protectedProcedure
    .input(z.object({ runId, run: sharedRunSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await createShare(getAdminFirestore(), {
          uid: ctx.authUser.uid,
          runId: input.runId,
          run: input.run,
          rate: shareRate(),
        });
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  /** The live link of one of the user's runs, or null. */
  forRun: protectedProcedure
    .input(z.object({ runId }))
    .query(({ ctx, input }) =>
      findShareForRun(getAdminFirestore(), ctx.authUser.uid, input.runId),
    ),

  /** Delete one of the user's links; it stops working at once. */
  delete: protectedProcedure
    .input(z.object({ id: shareId }))
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteShare(getAdminFirestore(), ctx.authUser.uid, input.id);
        return { deleted: true };
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
