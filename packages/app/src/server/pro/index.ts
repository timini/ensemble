import "server-only";

import { env } from "~/env";
import { getCreditConfig } from "~/server/credits";
import { getAdminFirestore } from "~/server/firebase/firestore";
import { readProConfig, type ProConfig } from "./config";
import type { ProDeps } from "./proRunService";
import { createUpstream } from "./upstream";

let cached: ProConfig | undefined;

/** Pro settings from the server environment, read once. */
export function getProConfig(): ProConfig {
  cached ??= readProConfig(env);
  return cached;
}

/** The production dependencies of the Pro run path. */
export function getProDeps(): ProDeps {
  const config = getProConfig();
  return {
    db: getAdminFirestore(),
    config,
    credit: getCreditConfig(),
    upstream: (options) => createUpstream(config, options),
  };
}
