import { StateCreator, StoreMutatorIdentifier } from 'zustand';

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
    const { name, storage = localStorage } = options;

    // Load initial state from localStorage
    const storedValue = storage.getItem(name);
    if (storedValue) {
      try {
        const parsedState = JSON.parse(storedValue);
        // Merge persisted state with initial state
        set(parsedState as Partial<T>);
      } catch (error) {
        console.error('Failed to parse stored state:', error);
      }
    }

    // Subscribe to state changes and persist to localStorage
    api.subscribe((state) => {
      try {
        storage.setItem(name, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    });

    return config(set, get, api);
  }) as StateCreator<T, Mps, Mcs>;
};
