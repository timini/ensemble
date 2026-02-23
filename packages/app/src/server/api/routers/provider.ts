import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  listProviderTextModels,
  streamProviderResponse,
} from "~/server/providers/providerService";

const providerSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "xai",
  "deepseek",
  "perplexity",
]);

export const providerRouter = createTRPCRouter({
  listTextModels: protectedProcedure
    .input(
      z.object({
        provider: providerSchema,
      }),
    )
    .query(async ({ input }) => {
      const models = await listProviderTextModels(input.provider);
      return {
        provider: input.provider,
        models,
      };
    }),

  streamText: protectedProcedure
    .input(
      z.object({
        provider: providerSchema,
        model: z.string().min(1),
        prompt: z.string().min(1),
        temperature: z.number().min(0).max(2).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await streamProviderResponse(input);
        return {
          provider: input.provider,
          model: input.model,
          ...result,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),
});
