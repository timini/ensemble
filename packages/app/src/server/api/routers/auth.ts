import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from '~/server/api/trpc';

export const authRouter = createTRPCRouter({
  /** Returns the current user ID if authenticated, null otherwise */
  getSession: publicProcedure.query(({ ctx }) => {
    return { userId: ctx.userId };
  }),

  /** Stub for Pro mode status — returns user info and placeholder credits */
  getProStatus: protectedProcedure.query(({ ctx }) => {
    return {
      userId: ctx.userId,
      isProUser: true,
      credits: 0,
    };
  }),
});
