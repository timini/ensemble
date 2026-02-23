import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const email = process.env.TEST_FIREBASE_AUTH_EMAIL;
const password = process.env.TEST_FIREBASE_AUTH_PASSWORD;

if (!email || !password) {
  console.log(
    "[ensure-firebase-test-user] Skipping: TEST_FIREBASE_AUTH_EMAIL or TEST_FIREBASE_AUTH_PASSWORD is not set.",
  );
  process.exit(0);
}

if (!projectId || !clientEmail || !privateKey) {
  console.log(
    "[ensure-firebase-test-user] Skipping: Firebase Admin credentials are not fully configured.",
  );
  process.exit(0);
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const auth = getAuth();

try {
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, {
    password,
    emailVerified: true,
    disabled: false,
  });
  console.log(
    `[ensure-firebase-test-user] Updated existing test user: ${email}`,
  );
} catch (error) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "auth/user-not-found"
  ) {
    await auth.createUser({
      email,
      password,
      emailVerified: true,
      disabled: false,
    });
    console.log(`[ensure-firebase-test-user] Created test user: ${email}`);
    process.exit(0);
  }

  throw error;
}
