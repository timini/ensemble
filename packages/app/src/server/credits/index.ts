import "server-only";

import { env } from "~/env";
import { readCreditConfig, type CreditConfig } from "./config";

export * from "./config";
export * from "./creditService";
export * from "./errors";
export * from "./grants";
export * from "./money";
export * from "./pricing";
export * from "./reversals";

let cached: CreditConfig | undefined;

/** Credit settings from the server environment, read once. */
export function getCreditConfig(): CreditConfig {
  cached ??= readCreditConfig(env);
  return cached;
}
export * from "./runBilling";
