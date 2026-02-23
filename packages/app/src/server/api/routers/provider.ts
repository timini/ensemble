import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
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

  streamTextEvents: protectedProcedure
    .input(
      z.object({
        provider: providerSchema,
        model: z.string().min(1),
        prompt: z.string().min(1),
        temperature: z.number().min(0).max(2).optional(),
      }),
    )
    .subscription(({ input }) => {
      return observable<
        | { type: "chunk"; chunk: string }
        | {
            type: "complete";
            response: string;
            responseTimeMs: number;
            tokenCount?: number;
          }
      >((emit) => {
        let isSubscribed = true;

        void streamProviderResponse(input, {
          onChunk: (chunk) => {
            if (!isSubscribed) return;
            emit.next({ type: "chunk", chunk });
          },
        })
          .then((result) => {
            if (!isSubscribed) return;
            emit.next({
              type: "complete",
              ...result,
            });
            emit.complete();
          })
          .catch((error) => {
            if (!isSubscribed) return;
            const message = error instanceof Error ? error.message : String(error);
            emit.error(
              new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message,
              }),
            );
          });

        return () => {
          isSubscribed = false;
        };
      });
    }),
});
