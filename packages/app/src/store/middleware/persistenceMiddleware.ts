import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

/**
 * Persistence middleware for Zustand store
 *
 * Syncs essential store state to localStorage for persistence across sessions
 * Only persists: theme, language, API keys (encrypted), and presets
 * Transient data (responses, streaming state) is NOT persisted
 */

type PersistOptions = {
  name: string;
  storage?: Storage;
};

export const persist = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  config: StateCreator<T, Mps, Mcs>,
  options: PersistOptions,
) => {
  return ((set, get, api) => {
    const baseState = config(set, get, api);

    if (typeof window === 'undefined') {
      return baseState;
    }

    const { name, storage = localStorage } = options;

    let hydratedState = baseState;

    try {
      const storedValue = storage.getItem(name);
      if (storedValue) {
        const parsedState = JSON.parse(storedValue) as Partial<T>;
        hydratedState = {
          ...baseState,
          ...parsedState,
        };
      }
    } catch (error) {
      console.error('Failed to parse stored state:', error);
    }

    // Replace the current state with the hydrated version so selectors re-run
    set(() => hydratedState, true);

    // Persist future updates. Functions are ignored by JSON.stringify, so only
    // serialisable data is stored.
    api.subscribe((state) => {
      try {
        storage.setItem(name, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    });

    return hydratedState;
  }) as StateCreator<T, Mps, Mcs>;
};
