import "server-only";

import { cache } from "react";
import { getAdminFirestore } from "~/server/firebase/firestore";
import { getShare, type PublicShare } from "./shareStore";

/**
 * A share for its public page and Open Graph image, read once per request.
 * Null when it does not exist or has expired. A Firestore failure throws,
 * so the page shows an error rather than telling the visitor a working
 * link has expired.
 */
export const loadShare = cache(
  (id: string): Promise<PublicShare | null> =>
    getShare(getAdminFirestore(), id),
);
