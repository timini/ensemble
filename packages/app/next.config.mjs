/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import("next").NextConfig} */
const config = {
    // NEXT_DIST_DIR lets the E2E suite run a Free-mode dev server next to the
    // mock-mode one without sharing a build directory.
    distDir: process.env.NEXT_DIST_DIR || ".next",
    output: "standalone",
    poweredByHeader: false,
    // Security headers on every response. Pages get their
    // Content-Security-Policy, with a per-request script nonce, from
    // src/middleware.ts (src/lib/security/contentSecurityPolicy.ts); API
    // responses, which render nothing, get a locked-down one here.
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
                ],
            },
            {
                source: "/api/:path*",
                headers: [
                    { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'" },
                ],
            },
        ];
    },
    transpilePackages: ["@ensemble-ai/shared-utils", "@ai-ensemble/component-library"],
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            "@radix-ui/react-use-effect-event": new URL("../../node_modules/@radix-ui/react-use-effect-event", import.meta.url).pathname,
        };
        return config;
    },
};

export default withSentryConfig(config, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.SENTRY_AUTH_TOKEN,
    tunnelRoute: "/monitoring",
    sourcemaps: { deleteSourcemapsAfterUpload: true },
    telemetry: false,
    hideSourceMaps: true,
    widenClientFileUpload: true,
    release: { name: process.env.SENTRY_RELEASE },
});
