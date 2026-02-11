/**
 * Auth Slice
 *
 * Manages Firebase authentication state for Pro mode.
 * Auth data is NEVER persisted to localStorage — Firebase manages its own
 * IndexedDB persistence and the sync hook re-hydrates on every page load.
 */

import type { StateCreator } from 'zustand';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthSlice {
  authUser: AuthUser | null;
  authStatus: AuthStatus;
  idToken: string | null;
  setAuthUser: (user: AuthUser | null) => void;
  setAuthStatus: (status: AuthStatus) => void;
  setIdToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  authUser: null,
  authStatus: 'idle',
  idToken: null,

  setAuthUser: (user) => set({ authUser: user }),
  setAuthStatus: (status) => set({ authStatus: status }),
  setIdToken: (token) => set({ idToken: token }),
  clearAuth: () =>
    set({ authUser: null, authStatus: 'unauthenticated', idToken: null }),
});
