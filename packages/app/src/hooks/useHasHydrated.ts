import { useEffect, useState } from 'react';

/**
 * Tracks when the component has mounted on the client so we can safely
 * reference persisted Zustand state without triggering hydration mismatches.
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {

    setHydrated(true);
  }, []);

  return hydrated;
}
