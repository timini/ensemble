import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  listPurchases,
  listRuns,
  modelUsageSince,
} from "~/server/credits/accountHistory";
import { getCreditAccount } from "~/server/credits/creditService";
import { getCreditConfig } from "~/server/credits";
import { quoteRunForUser } from "~/server/credits/runBilling";
import { getAdminFirestore } from "~/server/firebase/firestore";

const MAX_MODELS = 12;

const modelRef = z.object({
  provider: z.string().min(1).max(64),
  modelId: z.string().min(1).max(200),
});

/** The run settings estimateRun needs, as the composer has them. */
export const runQuoteInput = z.object({
  models: z.array(modelRef).min(1).max(MAX_MODELS),
  manualResponseCount: z.number().int().min(0).max(MAX_MODELS).optional(),
  consensusMethod: z.enum(["standard", "elo", "majority", "council"]),
  summarizer: modelRef.nullable(),
  eloTopN: z.number().int().min(0).max(MAX_MODELS),
  embeddings: modelRef.nullable(),
  promptTokens: z.number().int().min(0).max(2_000_000),
});

/** One page of a list on /account. The cursor is the last item's id. */
const pageInput = (maxCursor: number) =>
  z.object({
    cursor: z
      .string()
      .max(maxCursor)
      .regex(/^[A-Za-z0-9_-]+$/)
      .nullish(),
    limit: z.number().int().min(1).max(50).default(10),
  });

const DAY_MS = 24 * 60 * 60 * 1000;
/** Most runs summed for usage by model; older runs in the window are left out. */
const MAX_USAGE_RUNS = 1000;

/**
 * Credits for Pro mode. Balances are integer micro-dollars (1 USD is
 * 1,000,000). Reserving, settling and refunding happen on the server inside
 * the Pro run path, never from a client call.
 */
export const creditsRouter = createTRPCRouter({
  /** Credit packs on sale, from CREDIT_PACKS_USD. */
  packs: publicProcedure.query(() =>
    getCreditConfig().packs.map((p) => ({ ...p })),
  ),

  /** The signed-in user's balance and the low-balance warning (FR-038). */
  account: protectedProcedure.query(({ ctx }) =>
    getCreditAccount(getAdminFirestore(), getCreditConfig(), ctx.authUser.uid),
  ),

  /**
   * Price a run before it starts: credits it would reserve, and whether the
   * balance covers them (FR-036).
   */
  quote: protectedProcedure
    .input(runQuoteInput)
    .query(({ ctx, input }) =>
      quoteRunForUser(
        getAdminFirestore(),
        getCreditConfig(),
        ctx.authUser.uid,
        input,
      ),
    ),

  /** Purchases, refunds, disputes and grants, newest first (FR-041). */
  purchases: protectedProcedure
    // A ledger entry id.
    .input(pageInput(256))
    .query(({ ctx, input }) =>
      listPurchases(getAdminFirestore(), ctx.authUser.uid, input),
    ),

  /** Settled Pro runs, newest first, with their models and charge (FR-041). */
  runs: protectedProcedure
    // A run id, which assertSafeId limits to 128 characters.
    .input(pageInput(128))
    .query(({ ctx, input }) =>
      listRuns(getAdminFirestore(), ctx.authUser.uid, input),
    ),

  /** Calls, tokens and credits per model over the last `days` days (FR-041). */
  usageByModel: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(365).default(30) }))
    .query(({ ctx, input }) =>
      modelUsageSince(getAdminFirestore(), ctx.authUser.uid, {
        sinceMs: Date.now() - input.days * DAY_MS,
        maxRuns: MAX_USAGE_RUNS,
      }),
    ),
});
