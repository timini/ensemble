import { z } from "zod";
import {
  createTRPCRouter,
  proProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { listProviderTextModels } from "~/server/providers/providerService";
import { getProDeps } from "~/server/pro";
import { toProTRPCError } from "~/server/pro/errors";
import {
  embedProCall,
  streamProCall,
  structuredProCall,
} from "~/server/pro/proCalls";

const providerSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "xai",
  "deepseek",
  "perplexity",
]);

/** Run and call ids: the ledger's safe id rule (letters, digits, - and _). */
const idSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/)
  .refine((v) => !v.includes("__"));

const callRef = { runId: idSchema, callId: idSchema };

/** Longest prompt a Pro call takes, in characters (about 50,000 tokens). */
const MAX_PROMPT_CHARS = 200_000;

/**
 * Model calls. `listTextModels` uses the direct server keys. The three Pro
 * calls (`streamTextEvents`, `generateStructured`, `generateEmbeddings`) go
 * to OpenRouter with the server key and are billed to an open Pro run
 * (`proRun.start`): each names its run and a call id that may be used once.
 */
export const providerRouter = createTRPCRouter({
  listTextModels: protectedProcedure
    .input(z.object({ provider: providerSchema }))
    .query(async ({ input }) => {
      const models = await listProviderTextModels(input.provider);
      return { provider: input.provider, models };
    }),

  /**
   * One answer, streamed over SSE as chunk events and a complete event.
   * Closing the subscription aborts the upstream request; the text produced
   * so far is billed.
   */
  streamTextEvents: proProcedure
    .input(
      z.object({
        ...callRef,
        provider: providerSchema,
        model: z.string().min(1).max(200),
        prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
        temperature: z.number().min(0).max(2).optional(),
        seed: z.number().int().optional(),
      }),
    )
    .subscription(async function* ({ ctx, input, signal }) {
      try {
        yield* streamProCall(getProDeps(), ctx.authUser.uid, input, signal);
      } catch (error) {
        throw toProTRPCError(error);
      }
    }),

  /** A structured (JSON) call, used by the consensus strategies. */
  generateStructured: proProcedure
    .input(
      z.object({
        ...callRef,
        provider: providerSchema,
        model: z.string().min(1).max(200),
        prompt: z.string().min(1).max(MAX_PROMPT_CHARS),
        schema: z.object({
          name: z.string().min(1).max(64),
          schema: z.record(z.unknown()),
        }),
        temperature: z.number().min(0).max(2).optional(),
      }),
    )
    .mutation(async ({ ctx, input, signal }) => {
      try {
        return await structuredProCall(
          getProDeps(),
          ctx.authUser.uid,
          input,
          signal,
        );
      } catch (error) {
        throw toProTRPCError(error);
      }
    }),

  /** One embedding for the agreement score. */
  generateEmbeddings: proProcedure
    .input(
      z.object({
        ...callRef,
        provider: z.enum(["openai", "google"]),
        text: z.string().min(1).max(MAX_PROMPT_CHARS),
      }),
    )
    .mutation(async ({ ctx, input, signal }) => {
      try {
        return await embedProCall(
          getProDeps(),
          ctx.authUser.uid,
          input,
          signal,
        );
      } catch (error) {
        throw toProTRPCError(error);
      }
    }),
});
