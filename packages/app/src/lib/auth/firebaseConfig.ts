/** The public Firebase web config variables, inlined by Next at build time. */
export interface FirebaseClientEnv {
  NEXT_PUBLIC_FIREBASE_API_KEY?: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  NEXT_PUBLIC_FIREBASE_APP_ID?: string;
  /** `127.0.0.1:9099` to use the Auth emulator (tests and local development). */
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST?: string;
}

export interface FirebaseClientConfig {
  options: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId?: string;
  };
  emulatorHost: string | null;
}

/**
 * The client config, or null when sign-in is not set up: then the app runs
 * in Free (or mock) mode and the account menu says sign-in is unavailable.
 * With only the emulator host set, a demo project is used, which needs no
 * cloud project.
 */
export function readFirebaseClientConfig(
  env: FirebaseClientEnv,
): FirebaseClientConfig | null {
  // An empty variable counts as unset.
  const host = env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  const emulatorHost = host && host.length > 0 ? host : null;
  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (apiKey && authDomain && projectId) {
    const appId = env.NEXT_PUBLIC_FIREBASE_APP_ID;
    return {
      options: { apiKey, authDomain, projectId, ...(appId ? { appId } : {}) },
      emulatorHost,
    };
  }
  if (emulatorHost) {
    return {
      options: {
        apiKey: "demo-api-key",
        authDomain: "localhost",
        projectId: projectId ?? "demo-ensemble",
      },
      emulatorHost,
    };
  }
  return null;
}

/** The config of this build. Each variable is named in full so Next inlines it. */
export function firebaseClientConfig(): FirebaseClientConfig | null {
  return readFirebaseClientConfig({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
  });
}
