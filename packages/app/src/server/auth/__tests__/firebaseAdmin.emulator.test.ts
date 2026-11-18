import { describe, expect, it } from "vitest";
import { verifyFirebaseAuthToken } from "../firebaseAdmin";

/** Sign up a user on the Auth emulator and return its ID token. */
async function emulatorIdToken(email: string): Promise<string> {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host)
    throw new Error(
      "FIREBASE_AUTH_EMULATOR_HOST is not set; run npm run test:emulator",
    );
  const res = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: "emulator-only",
        returnSecureToken: true,
      }),
    },
  );
  const body = (await res.json()) as { idToken?: string };
  if (!body.idToken)
    throw new Error(`Emulator sign-up failed: ${JSON.stringify(body)}`);
  return body.idToken;
}

describe("verifyFirebaseAuthToken against the Auth emulator", () => {
  it("accepts a token the emulator issued, as the client SDK would send it", async () => {
    const email = `user-${Date.now()}@example.com`;
    const user = await verifyFirebaseAuthToken(await emulatorIdToken(email));
    expect(user?.email).toBe(email);
    expect(user?.uid).toBeTruthy();
  });

  it("rejects a forged token", async () => {
    expect(await verifyFirebaseAuthToken("not-a-token")).toBeNull();
  });
});
