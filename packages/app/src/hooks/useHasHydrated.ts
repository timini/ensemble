import { useEffect, useState } from 'react';
import { logger } from '~/lib/logger';

/**
 * Tracks when the component has mounted on the client so we can safely
 * reference persisted Zustand state without triggering hydration mismatches.
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    logger.debug('[useHasHydrated] Setting hydrated=true');
    setHydrated(true);
  }, []);

  return hydrated;
}
