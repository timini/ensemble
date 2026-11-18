import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { SYNC_LIST_LIMIT } from "~/lib/sync/syncItems";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getAdminFirestore } from "~/server/firebase/firestore";
import { RateLimitError, takeRateSlot } from "~/server/pro/rateLimit";
import {
  listSyncItems,
  removeSyncItems,
  SyncItemError,
  upsertSyncItems,
} from "~/server/sync/syncStore";

const kind = z.enum(["history", "presets"]);
const id = z.string().min(1).max(128);

/** Sync writes one user may make per 10 minutes. Each upload or delete call counts once. */
export const SYNC_WRITE_RATE = { limit: 300, windowSeconds: 600 };

function toTRPCError(error: unknown): unknown {
  if (error instanceof RateLimitError)
    return new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: error.message,
      cause: error,
    });
  if (error instanceof SyncItemError)
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  return error;
}

async function writeSlot(uid: string) {
  await takeRateSlot(
    getAdminFirestore(),
    `sync__${uid}`,
    SYNC_WRITE_RATE,
    "sync writes",
  );
}

/**
 * Synced history and presets for signed-in users. The browser keeps its
 * own copy in IndexedDB and localStorage; this router is the account's
 * copy, merged on sign-in (see hooks/useCollectionSync.ts).
 */
export const syncRouter = createTRPCRouter({
  /** Every item and tombstone of one kind, newest change first. */
  list: protectedProcedure
    .input(z.object({ kind }))
    .query(({ ctx, input }) =>
      listSyncItems(getAdminFirestore(), ctx.authUser.uid, input.kind),
    ),

  /** Store items; an item older than the stored copy is skipped. */
  upsert: protectedProcedure
    .input(
      z.object({
        kind,
        items: z
          .array(
            z.object({
              id,
              updatedAt: z.number().int().nonnegative(),
              payload: z.string().max(1_000_000),
            }),
          )
          .max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await writeSlot(ctx.authUser.uid);
        const written = await upsertSyncItems(
          getAdminFirestore(),
          ctx.authUser.uid,
          input.kind,
          input.items,
        );
        return { written };
      } catch (error) {
        throw toTRPCError(error);
      }
    }),

  /** Delete items on every device. */
  remove: protectedProcedure
    .input(z.object({ kind, ids: z.array(id).min(1).max(SYNC_LIST_LIMIT) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await writeSlot(ctx.authUser.uid);
        await removeSyncItems(
          getAdminFirestore(),
          ctx.authUser.uid,
          input.kind,
          input.ids,
        );
        return { removed: input.ids.length };
      } catch (error) {
        throw toTRPCError(error);
      }
    }),
});
