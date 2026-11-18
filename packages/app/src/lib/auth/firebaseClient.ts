import type { FirebaseClientConfig } from "./firebaseConfig";

/** The signed-in user as the app needs it. */
export interface SignedInUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

/** The Firebase Auth calls the app makes, behind one small interface. */
export interface AuthClient {
  /** Calls back with the user now and on every change. Returns an unsubscribe. */
  onUserChanged: (callback: (user: SignedInUser | null) => void) => () => void;
  getIdToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  sendEmailLink: (email: string, continueUrl: string) => Promise<void>;
  isEmailLink: (href: string) => boolean;
  completeEmailLink: (email: string, href: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const APP_NAME = "ensemble-auth";
let loading: Promise<AuthClient> | null = null;

async function create(config: FirebaseClientConfig): Promise<AuthClient> {
  // Loaded on demand, so Free mode without sign-in never downloads the SDK.
  const [{ initializeApp, getApps }, authSdk] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
  ]);
  const app =
    getApps().find((a) => a.name === APP_NAME) ??
    initializeApp(config.options, APP_NAME);
  const auth = authSdk.getAuth(app);
  if (config.emulatorHost) {
    authSdk.connectAuthEmulator(auth, `http://${config.emulatorHost}`, {
      disableWarnings: true,
    });
  }
  return {
    onUserChanged: (callback) =>
      authSdk.onAuthStateChanged(auth, (user) =>
        callback(
          user
            ? {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
              }
            : null,
        ),
      ),
    getIdToken: async () =>
      auth.currentUser ? auth.currentUser.getIdToken() : null,
    signInWithGoogle: async () => {
      await authSdk.signInWithPopup(auth, new authSdk.GoogleAuthProvider());
    },
    sendEmailLink: (email, continueUrl) =>
      authSdk.sendSignInLinkToEmail(auth, email, {
        url: continueUrl,
        handleCodeInApp: true,
      }),
    isEmailLink: (href) => authSdk.isSignInWithEmailLink(auth, href),
    completeEmailLink: async (email, href) => {
      await authSdk.signInWithEmailLink(auth, email, href);
    },
    signOut: () => authSdk.signOut(auth),
  };
}

/** The Firebase Auth client for this config, created once per page. */
export function loadAuthClient(
  config: FirebaseClientConfig,
): Promise<AuthClient> {
  loading ??= create(config).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

/** For tests: forget the cached client. */
export function resetAuthClientForTests(): void {
  loading = null;
}
