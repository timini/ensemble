import "server-only";

import { cache } from "react";
import { logger } from "~/lib/logger";
import { toError } from "~/lib/errors";
import { getAdminFirestore } from "~/server/firebase/firestore";
import { getShare, type PublicShare } from "./shareStore";

/**
 * A share for its public page and Open Graph image, read once per request.
 * Null when it does not exist, has expired, or Firestore cannot be reached
 * (a build without Firebase): the page then says the link does not work.
 */
export const loadShare = cache(
  async (id: string): Promise<PublicShare | null> => {
    try {
      return await getShare(getAdminFirestore(), id);
    } catch (error) {
      logger.warn("Share: could not read a share", toError(error));
      return null;
    }
  },
);
