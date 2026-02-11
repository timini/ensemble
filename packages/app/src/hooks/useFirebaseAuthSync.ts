/**
 * useFirebaseAuthSync
 *
 * Listens to Firebase `onAuthStateChanged`, syncs user + token to Zustand,
 * and refreshes the ID token every 50 minutes (tokens expire after 60 min).
 */
import { useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '~/lib/firebase';
import { useStore } from '~/store';
import type { AuthUser } from '~/store/slices/authSlice';

const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 minutes

function syncFirebaseUser(
  firebaseUser: User,
  setAuthUser: (u: AuthUser) => void,
  setIdToken: (t: string | null) => void,
  setAuthStatus: (s: 'authenticated') => void,
): void {
  const user: AuthUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
  void firebaseUser.getIdToken().then((token) => {
    setAuthUser(user);
    setIdToken(token);
    setAuthStatus('authenticated');
  });
}

export function useFirebaseAuthSync(): void {
  const setAuthUser = useStore((s) => s.setAuthUser);
  const setAuthStatus = useStore((s) => s.setAuthStatus);
  const setIdToken = useStore((s) => s.setIdToken);
  const clearAuth = useStore((s) => s.clearAuth);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // Firebase not configured — mark as unauthenticated so Free mode works
      setAuthStatus('unauthenticated');
      return;
    }

    setAuthStatus('loading');

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        syncFirebaseUser(firebaseUser, setAuthUser, setIdToken, setAuthStatus);
      } else {
        clearAuth();
      }
    });

    // Refresh token periodically to prevent expiry
    const refreshInterval = setInterval(() => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        void currentUser.getIdToken(true).then((token) => {
          setIdToken(token);
        });
      }
    }, TOKEN_REFRESH_INTERVAL_MS);

    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [setAuthUser, setAuthStatus, setIdToken, clearAuth]);
}
