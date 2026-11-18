import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Clears every cached `credits.*` query (balance, quote, purchases, runs,
 * usage) when the signed-in user changes or signs out, so the next user of
 * the same tab never sees the last one's credits while theirs load.
 * Queries in use refetch for the new user.
 */
export function useResetCreditsOnUserChange(uid: string | null) {
  const queryClient = useQueryClient();
  const last = useRef(uid);
  useEffect(() => {
    if (last.current === uid) return;
    last.current = uid;
    void queryClient.resetQueries({ queryKey: [["credits"]] });
  }, [uid, queryClient]);
}
