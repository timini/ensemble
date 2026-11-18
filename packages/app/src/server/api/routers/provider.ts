import { z } from "zod";
import { createTRPCRouter, proProcedure } from "~/server/api/trpc";
import { listProviderTextModels } from "~/server/providers/providerService";
import { getProDeps } from "~/server/pro";
import { toProTRPCError } from "~/server/pro/errors";
import {
  embedProCall,
  prepareProStream,
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
 * Model calls. `listTextModels` uses the direct server keys, so it is a
 * Pro procedure like the billed calls (App Check when enforced). The Pro calls
 * (`prepareStream` then `streamTextEvents`, `generateStructured`,
 * `generateEmbeddings`) go
 * to OpenRouter with the server key and are billed to an open Pro run
 * (`proRun.start`): each names its run and a call id that may be used once.
 */
export const providerRouter = createTRPCRouter({
  listTextModels: proProcedure
    .input(z.object({ provider: providerSchema }))
    .query(async ({ input }) => {
      const models = await listProviderTextModels(input.provider);
      return { provider: input.provider, models };
    }),

  /**
   * Admit one streamed answer and keep its request for streamTextEvents.
   * The prompt travels here, in a POST body: an SSE subscription is a GET,
   * so its input would go in the URL (length limits, request logs).
   */
  prepareStream: proProcedure
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
    .mutation(async ({ ctx, input }) => {
      try {
        await prepareProStream(getProDeps(), ctx.authUser.uid, input);
        return { ok: true as const };
      } catch (error) {
        throw toProTRPCError(error);
      }
    }),

  /**
   * One prepared answer, streamed over SSE as chunk events and a complete
   * event. A prepared stream can be started once. Closing the subscription
   * aborts the upstream request; the text produced so far is billed.
   */
  streamTextEvents: proProcedure
    .input(z.object(callRef))
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
