/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import("next").NextConfig} */
const config = {
    output: "standalone",
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
    sourcemaps: { deleteSourcemapsAfterUpload: true },
    telemetry: false,
    hideSourceMaps: true,
    widenClientFileUpload: true,
    release: { name: process.env.SENTRY_RELEASE },
});
