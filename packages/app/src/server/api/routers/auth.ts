import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => ({
    uid: ctx.authUser.uid,
    ...(ctx.authUser.email ? { email: ctx.authUser.email } : {}),
    ...(ctx.authUser.name ? { name: ctx.authUser.name } : {}),
    ...(ctx.authUser.picture ? { picture: ctx.authUser.picture } : {}),
  })),
});
