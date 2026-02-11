/**
 * Firebase auth helpers — thin wrappers around Firebase popup auth.
 *
 * All state updates happen via `onAuthStateChanged` in the sync hook;
 * these functions only trigger the auth flow.
 */
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

export async function signInWithGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not configured');
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInWithGitHub(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not configured');
  await signInWithPopup(auth, new GithubAuthProvider());
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}
