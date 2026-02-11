/**
 * Share Router
 *
 * tRPC router for creating and retrieving shared review results.
 * Stores shared reviews in Firestore. When Firestore is unavailable,
 * returns appropriate error messages.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getFirestore } from "~/server/lib/firestore";

const COLLECTION = "shared-reviews";

const sharedResponseSchema = z.object({
  modelId: z.string(),
  provider: z.string(),
  model: z.string(),
  response: z.string(),
  responseTime: z.number().nullable(),
  tokenCount: z.number().nullable(),
});

const sharedManualResponseSchema = z.object({
  id: z.string(),
  label: z.string(),
  response: z.string(),
});

const agreementStatsSchema = z.object({
  mean: z.number(),
  median: z.number(),
  min: z.number(),
  max: z.number(),
  stddev: z.number(),
});

const pairwiseComparisonSchema = z.object({
  model1: z.string(),
  model2: z.string(),
  similarity: z.number(),
  confidence: z.number(),
});

const createShareInput = z.object({
  prompt: z.string().min(1),
  responses: z.array(sharedResponseSchema).min(1),
  manualResponses: z.array(sharedManualResponseSchema).optional().default([]),
  consensusText: z.string().nullable().optional(),
  summarizerModel: z.string().nullable().optional(),
  agreementStats: agreementStatsSchema.nullable().optional(),
  overallAgreement: z.number().nullable().optional(),
  pairwiseComparisons: z.array(pairwiseComparisonSchema).optional().default([]),
});

export type SharedReview = z.infer<typeof createShareInput> & {
  id: string;
  createdAt: string;
};

function generateShareId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export const shareRouter = createTRPCRouter({
  create: publicProcedure
    .input(createShareInput)
    .mutation(async ({ input }) => {
      const db = getFirestore();
      if (!db) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Share feature is not available. Firestore is not configured.",
        });
      }

      const shareId = generateShareId();
      const doc: SharedReview = {
        id: shareId,
        ...input,
        createdAt: new Date().toISOString(),
      };

      await db.collection(COLLECTION).doc(shareId).set(doc);

      return { shareId };
    }),

  getById: publicProcedure
    .input(z.object({ shareId: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getFirestore();
      if (!db) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Share feature is not available.",
        });
      }

      const snapshot = await db.collection(COLLECTION).doc(input.shareId).get();

      if (!snapshot.exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared review not found.",
        });
      }

      return snapshot.data() as SharedReview;
    }),
});
