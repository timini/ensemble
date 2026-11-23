import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    XAI_API_KEY: z.string().optional(),
    DEEPSEEK_API_KEY: z.string().optional(),
    PERPLEXITY_API_KEY: z.string().optional(),
    CREDIT_MARGIN_PERCENT: z.string().optional(),
    CREDIT_LOW_BALANCE_USD: z.string().optional(),
    CREDIT_PACKS_USD: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    APP_URL: z.string().url().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_BASE_URL: z.string().url().optional(),
    PRO_MAX_RUN_TOKENS: z.string().optional(),
    PRO_MAX_CALL_OUTPUT_TOKENS: z.string().optional(),
    PRO_MAX_CALLS_PER_RUN: z.string().optional(),
    PRO_RATE_LIMIT_RUNS: z.string().optional(),
    PRO_RATE_LIMIT_WINDOW_SECONDS: z.string().optional(),
    PRO_MOCK_UPSTREAM: z.string().optional(),
    APP_CHECK_ENFORCE: z.string().optional(),
    SHARE_RATE_LIMIT_PER_HOUR: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_GA_MEASUREMENT_ID: z
      .string()
      .regex(/^G-[A-Z0-9]+$/)
      .optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    NEXT_PUBLIC_SENTRY_RELEASE: z.string().optional(),
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional(),
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN: z.string().optional(),
    NEXT_PUBLIC_MOCK_MODE: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NODE_ENV: process.env.NODE_ENV,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    CREDIT_MARGIN_PERCENT: process.env.CREDIT_MARGIN_PERCENT,
    CREDIT_LOW_BALANCE_USD: process.env.CREDIT_LOW_BALANCE_USD,
    CREDIT_PACKS_USD: process.env.CREDIT_PACKS_USD,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    APP_URL: process.env.APP_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
    PRO_MAX_RUN_TOKENS: process.env.PRO_MAX_RUN_TOKENS,
    PRO_MAX_CALL_OUTPUT_TOKENS: process.env.PRO_MAX_CALL_OUTPUT_TOKENS,
    PRO_MAX_CALLS_PER_RUN: process.env.PRO_MAX_CALLS_PER_RUN,
    PRO_RATE_LIMIT_RUNS: process.env.PRO_RATE_LIMIT_RUNS,
    PRO_RATE_LIMIT_WINDOW_SECONDS: process.env.PRO_RATE_LIMIT_WINDOW_SECONDS,
    PRO_MOCK_UPSTREAM: process.env.PRO_MOCK_UPSTREAM,
    APP_CHECK_ENFORCE: process.env.APP_CHECK_ENFORCE,
    SHARE_RATE_LIMIT_PER_HOUR: process.env.SHARE_RATE_LIMIT_PER_HOUR,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE:
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
    NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY,
    NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN:
      process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN,
    NEXT_PUBLIC_MOCK_MODE: process.env.NEXT_PUBLIC_MOCK_MODE,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
