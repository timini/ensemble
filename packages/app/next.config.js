/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    output: "standalone",
    transpilePackages: ["@ensemble-ai/shared-utils"],
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            "@radix-ui/react-use-effect-event": new URL("../../node_modules/@radix-ui/react-use-effect-event", import.meta.url).pathname,
        };
        return config;
    },
};

export default config;
